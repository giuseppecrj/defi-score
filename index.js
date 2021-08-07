require('dotenv').config()

const protocols = require('./protocols')
const { calculateData } = require('./utils')

const weights = {
    'engineeringWeeks': 0.045,
    'noCriticalVulns': 0.09,
    'recentOrNoCodeChanges': 0.0675,
    'timeIndex': 0.1125,
    'publicAudit': 0.0675,
    'hasBugBounty': 0.0675,
    'cVaR': 0.1,
    'poolCollateralization': 0.1,
    'poolLiquidity': 0.1,
    'centralizationRisk': 0.25
}

async function main() {
    console.log('Beginning score calculation...')

    const times = Object.keys(protocols).map((protocolKey) => {
        return protocols[protocolKey]?.values?.operatingWithoutExploitSince
    })


    await Promise.all(Object.keys(protocols).map((protocol) => {
        return calculateData({ protocol: protocols[protocol], times })
    }))
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
