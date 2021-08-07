const pool = require('./pool')
const finance = require('./finance')

async function calculateData({ protocol, times }) {
    const tokens = protocol.contracts.map(({ token }) => token)
    // const balances = await Promise.all(tokens.map((token) => {
    //     return pool.fetchData(protocol, token)
    // }))

    const balances = [
        await pool.fetchData(protocol, 'eth'),
        await pool.fetchData(protocol, 'sai'),
    ]

    const portfolio = await finance.fetchCvar(balances)
}

module.exports = { calculateData }
