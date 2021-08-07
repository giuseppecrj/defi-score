const { ethers } = require('ethers')

const provider = new ethers.providers.InfuraProvider('homestead', {
    projectId: process.env.INFURA_PROJECT_ID,
    projectSecret: process.env.INFURA_PROJECT_SECRET
})

function initializeContract(address, abi) {
    const _address = ethers.utils.getAddress(address)
    return new ethers.Contract(_address, abi, provider)
}

function findDecimals(token) {
    switch (token) {
        case 'wbtc':
            return 8
        case 'usdc':
        case 'usdt':
            return 6
        default:
            return 18
    }
}

module.exports = {
    provider,
    findDecimals,
    initializeContract
}
