const runText = require('./helpers/runText.js');
const fs = require('node:fs/promises');

(async () => {
    try {
        const text = await (await fs.readFile("./test/test.txt")).toString('utf-8'); // read testfile
        const result = await runText(text, "all");
        console.log(result);
    } catch(e) {
        console.log("An error occurred: ");
        console.log(e);
    }
})();