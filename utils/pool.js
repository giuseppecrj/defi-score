const web3 = require('./web3')
const abis = require('../protocols/abis')
const { ethers } = require('ethers')
const fetch = require('node-fetch')
const fs = require('fs-extra')
const path = require('path')

const cache = new Map()

async function currentUSDValue(token) {
    // todo
    if (token[0] === 'i' && token[1] === 'w') token = token.substring(0, 2)
    else token = token

    token = token.toUpperCase()

    if (cache.has(token)) return cache.get(token)

    const result = await fetch(`https://min-api.cryptocompare.com/data/dayAvg?fsym=${token}&tsym=USD`).then((r) => r.json())
    cache.set(token, result['USD'])
    return cache.get(token)
}

async function createPoolDataObject({ token, totalSupply, totalBorrowed, collateral = 0 }) {
    const usdPrice = await currentUSDValue(token)
    const liquidityBaseToken = totalSupply - totalBorrowed
    const utilizationRate = totalBorrowed / totalSupply
    const collateralBaseToken = collateral !== 0 ? collateral : liquidityBaseToken

    return {
        liquidity: liquidityBaseToken * usdPrice,
        liquidityBaseToken,
        collateral: collateralBaseToken * usdPrice,
        collateralBaseToken,
        totalSupply: totalSupply * usdPrice,
        totalSupplyBaseToken: totalSupply,
        totalBorrowed: totalBorrowed * usdPrice,
        totalBorrowedBaseToken: totalBorrowed,
        utilizationRate,
        usdPrice
    }
}

async function fetchCompoundData({ protocol, token }) {
    const info = protocol.contracts.find((p) => p.token === token)
    const decimals = web3.findDecimals(token)
    const abi = token === 'eth' ? abis[protocol.id] : abis['erc20']

    const contract = web3.initializeContract(info.contract, abi)
    const liquidity = await contract.getCash() / 10 ** decimals
    const totalBorrowed = await contract.totalBorrows() / 10 ** decimals
    const totalSupply = liquidity + totalBorrowed

    return createPoolDataObject({ token, totalSupply, totalBorrowed })
}


async function fetchData(protocol, token) {
    let dirPath = path.join(__dirname, '..', 'cache', protocol.id)
    let cachePath = path.join(__dirname, '..', 'cache', protocol.id, `${token}.json`)

    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true })

    if (fs.existsSync(cachePath)) {
        return JSON.parse(fs.readFileSync(cachePath).toString())
    } else {
        let data;

        switch (protocol.id) {
            case 'compound':
                data = await fetchCompoundData({ protocol, token })
            default:
                break;
        }

        data['protocol'] = protocol.id
        data['token'] = token

        fs.writeFileSync(cachePath, JSON.stringify(data, null, 4))
        return data
    }

}

module.exports = { fetchData }
