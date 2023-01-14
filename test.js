const runText = require('./helpers/runText.js');
const fs = require('node:fs/promises');

(async () => {
    try {
        const text = (await fs.readFile("./test/test.txt")).toString('utf-8'); // read testfile
        const result = await runText(text, "all", "public", {
            channelId: '932054016081412108',
            user: {
                id: '898733545210662933'
            }
        });
        console.log(result);
    } catch(e) {
        console.log("An error occurred: ");
        console.log(e);
    }
})();