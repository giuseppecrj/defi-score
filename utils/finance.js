const fetch = require('node-fetch')
const date = require('date-fns')
const yahoo = require('yahoo-finance')
const cache = require('./cache')
const path = require('path')
const percentile = require('percentile')

function getPercentageChange(oldNumber, newNumber) {
    var decreaseValue = oldNumber - newNumber;
    return (decreaseValue / oldNumber) * 100;
}

function pick(object, keys) {
    return keys.reduce((obj, key) => {
        if (object && object.hasOwnProperty(key)) {
            obj[key] = object[key];
        }
        return obj;
    }, {});
}

function toDateTime(time) {
    return new Date(time * 1000)
}

async function getYahooData({ ticker, lastDate, firstDate }) {
    let dirPath = path.join(__dirname, '..', 'cache', 'yahoo')
    let cachePath = path.join(__dirname, '..', 'cache', 'yahoo', `${ticker}.json`)
    let fn = () => {
        return yahoo.historical({
            symbol: ticker,
            from: firstDate,
            to: lastDate
        })
    }

    return await cache({ dirPath, cachePath, fn })
}

function parseReturns(tickerClose, token) {
    return tickerClose.map((value, index) => {
        if (index === 0) {
            value[`daily_returns`] = 0.0
            return value
        }

        const currValue = value['close']
        const prevValue = tickerClose[index - 1]['close']
        value[`daily_returns`] = getPercentageChange(currValue, prevValue)
        return value
    })
}

async function getCryptoCompareReturns(token) {
    let dirPath = path.join(__dirname, '..', 'cache', 'cryptocompare')
    let cachePath = path.join(__dirname, '..', 'cache', 'cryptocompare', `${token}.json`)

    const fn = async () => {
        const data = await fetch(`https://min-api.cryptocompare.com/data/v2/histoday?fsym=${token}&tsym=USD&limit=720`)
            .then((r) => r.json())

        const df = data['Data']['Data'].map((value) => {
            value['date'] = toDateTime(value.time)
            return pick(value, ['close', 'date'])
        })

        return parseReturns(df, token)
    }

    return await cache({ dirPath, cachePath, fn })
}

function getWeights(balances) {
    const total = balances.reduce((accum, balance) => {
        return accum += balance['liquidity']
    }, 0)

    const weights = balances.reduce((accum, balance) => {
        let percentage = balance['liquidity'] / total
        accum.push(percentage)
        return accum
    }, [])

    return weights
}

const stables = ['DAI', 'USDC', 'MKR', 'TUSD', 'USDT', 'SAI', 'SUSD', 'SNX', 'LEND']

async function getReturns(tokens) {

    const lastDate = date.format(Date.now(), 'yyyy-MM-dd')
    const firstDate = date.format(date.addDays(Date.now(), -520), 'yyyy-MM-dd')
    const dfList = await Promise.all(tokens.map(async ({ token }) => {
        if (token === 'wbtc') token = token.substring(1)
        token = token.toUpperCase()

        if (stables.includes(token)) {
            if (token === 'SAI') token = 'DAI'
            const tickerReturns = await getCryptoCompareReturns(token)
            return tickerReturns
        } else {
            const ticker = `${token}-USD`
            const tickerClose = await getYahooData({ ticker, lastDate, firstDate })
            const tickerReturns = parseReturns(tickerClose.reverse(), token)
            return tickerReturns
        }
    }))

    return dfList
        .map((values) => {
            return values
                .sort((a, b) => new Date(a.date) - new Date(b.date))
                .map((value) => {
                    return value.daily_returns
                })
        })
}

function dot(returns, weights, lookBack) {
    returns = returns.map((v) => v.slice(0, lookBack))
    return returns.map((vals) => {
        let s = 0
        weights.map((w) => {
            vals.map((v) => {
                s += w * v
            })
        })
        return s
    })
}

function valueAtRisk(returns, weights, alpha, lookBack) {
    const portfolioReturns = dot(returns, weights, lookBack)
    const _p = (100 * (1 - alpha))
    return percentile(_p, portfolioReturns)
}

const average = (array) => array.reduce((a, b) => a + b) / array.length;


function cvar(returns, weights, alpha, lookBack) {
    let _var = valueAtRisk(returns, weights, alpha, lookBack)
    let _portfolioReturns = dot(returns, weights, lookBack)
    return average(_portfolioReturns)
}


async function fetchCvar(balances) {
    const weights = getWeights(balances)
    const returns = await getReturns(balances)
    const portfolioCvar = cvar(returns, weights, 0.99, 10)

}

module.exports = {
    fetchCvar
}
