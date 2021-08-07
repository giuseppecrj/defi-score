const fs = require('fs-extra')

async function cache({ dirPath, cachePath, fn }) {
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true })

    if (fs.existsSync(cachePath)) {
        return JSON.parse(fs.readFileSync(cachePath).toString())
    } else {
        const data = await fn()
        fs.writeFileSync(cachePath, JSON.stringify(data, null, 4))
        return data
    }
}

module.exports = cache
