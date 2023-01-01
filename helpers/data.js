const fs = require('node:fs/promises')
const write = async (data, fileName) => {
    const asJson = JSON.stringify(data, null, 2);
    await fs.writeFile(fileName + ".json", asJson);
}

const clear = async fileName => {
    await fs.writeFile(fileName + ".json", "");
}

const read = async (filename, def) => {
    let str = (await fs.readFile(filename + ".json")).toString();
    if(str.length == 0) {
        str = def;
    }
    return JSON.parse(str);
}

module.exports = { write, read, clear };