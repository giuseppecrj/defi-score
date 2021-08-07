const fetch = require('node-fetch')
const date = require('date-fns')
const yahoo = require('yahoo-finance')
const cache = require('./cache')
const path = require('path')

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
    let dirPath = path.join(__dirname, '..', 'yahoo')
    let cachePath = path.join(__dirname, '..', 'yahoo', `${ticker}.json`)
    let fn = () => {
        return yahoo.historical({
            symbol: ticker,
            from: firstDate,
            to: lastDate
        })
    }

    return await cache({ dirPath, cachePath, fn })
}

async function getCryptoCompareReturns(token) {
    let dirPath = path.join(__dirname, '..', 'cryptocompare')
    let cachePath = path.join(__dirname, '..', 'cryptocompare', `${token}.json`)

    const fn = async () => {
        const data = await fetch(`https://min-api.cryptocompare.com/data/v2/histoday?fsym=${token}&tsym=USD&limit=720`)
            .then((r) => r.json())

        const df = data['Data']['Data'].map((value) => {
            value['date'] = toDateTime(value.time)
            return pick(value, ['close', 'date'])
        })

        return df
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

    await Promise.all(tokens.map(async ({ token }) => {
        if (token === 'wbtc') token = token.substring(1)
        token = token.toUpperCase()

        if (stables.includes(token)) {
            if (token === 'SAI') token = 'DAI'
            const tickerReturns = await getCryptoCompareReturns(token)
        } else {
            const ticker = `${token}-USD`
            const tickerClose = await getYahooData({ ticker, lastDate, firstDate })
            const tickerReturns = tickerClose.map((value, index) => {
                if (index === 0) {
                    value[`daily_returns_${token}`] = 0.0
                    return value
                }

                const currValue = value['close']
                const prevValue = tickerClose[index - 1]['close']
                value[`daily_returns_${token}`] = getPercentageChange(prevValue, currValue)
                return value
            })

            console.log(tickerReturns)
        }
    }))
}


async function fetchCvar(balances) {
    const weights = getWeights(balances)
    const returns = await getReturns(balances)

}

module.exports = {
    fetchCvar
}
