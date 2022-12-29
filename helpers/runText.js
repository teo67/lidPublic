const Lex = require('../lex.js').Lex;
const Parser = require('../parsing.js');
const operators = require('../operators.js');
const values = require('../values.js');
const data = require('./data.js');
const Scope = require('../scope.js');
const deleteReference = require('./deleteReference.js');

module.exports = async (text, outputFormat) => {
    let baseScope;
    let references;
    let referenceData;
    try {
        baseScope = await data.read("./cache/variables", "{}");
        references = await data.read("./cache/references", "{}");
        referenceData = await data.read("./cache/referenceData", "{\"next\": 0, \"stack\": []}");
    } catch {
        return "Error reading previous variable scope!";
    }
    const translated = new Scope(null, baseScope, true);
    referenceData.edited = [];
    let result;
    try {
        const lex = new Lex(text);
        const parser = new Parser(lex);
        const expr = parser.parseExpressions();
        result = operators.operatorArray[expr.num](expr.args, translated, references, referenceData);
    } catch(e) {
        return `There was an error parsing your code: \n${e}`;
    }
    for(const edited of referenceData.edited) {
        const ref = references[edited];
        if(ref === undefined) {
            continue;
        }
        if(ref.num == 0) {
            deleteReference(references, referenceData, edited); // delete them if no longer being used
        }
    }
    delete referenceData.edited;
    try {
        await data.write(baseScope, "./cache/variables");
        await data.write(references, "./cache/references");
        await data.write(referenceData, "./cache/referenceData");
    } catch {
        return "Error writing to variable scope!";
    }
    if(result.type != values.types.ARRAY) {
        return "Error: improper formatting";
    }
    switch(outputFormat) {
        case "first-only":
            return values.getString(values.breakVariable(result.val[0], translated, references));
        case "last-only":
            return values.getString(values.breakVariable(result.val[result.val.length - 1], translated, references));
        case "all":
            let output = "";
            for(let i = 0; i < result.val.length; i++) {
                const res = values.getString(values.breakVariable(result.val[i], translated, references));
                if(res.length > 0) {
                    output += `Expression ${i}: ${res}\n`;
                } else {
                    output += `No valid return value for expression ${i}`;
                }
            }
            return output;
        case "none":
            return "Done!";
        default:
            return "Error: invalid output format!";
    }
}