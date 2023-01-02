const Lex = require('../lex.js').Lex;
const Parser = require('../parsing.js');
const operators = require('../operators.js');
const values = require('../values.js');
const data = require('./data.js');
const Scope = require('../scope.js');
const deleteReference = require('./deleteReference.js');

const removeReference = (key, references, referenceData) => {
    if(references[key] !== undefined) {
        const ref = references[key];
        if(ref.usedBy == 0) {
            for(const use in ref.uses) {
                references[use].usedBy--;
                removeReference(use, references, referenceData);
            }
            deleteReference(references, referenceData, key);
        }
    }
}

module.exports = async (text, outputFormat) => {
    let baseScope;
    let references;
    let referenceData;
    try {
        baseScope = await data.read("./cache/variables", "{}");
        references = await data.read("./cache/references", "{}");
        referenceData = await data.read("./cache/referenceData", "{\"next\": 0, \"stack\": [], \"baseUses\": {}}");
    } catch {
        return "Error reading previous variable scope!";
    }
    const translated = new Scope(null, baseScope, true);
    referenceData.edited = {};
    let result;
    try {
        const lex = new Lex(text);
        const parser = new Parser(lex);
        const expr = parser.parseExpressions();
        result = operators.operatorArray[expr.num](expr.args, translated, references, referenceData);
    } catch(e) {
        return `There was an error parsing your code: \n${e}`;
    }
    let output = "";
    if(result.type != values.types.ARRAY) {
        output = "Error: improper formatting";
    } else {
        switch(outputFormat) {
            case "first-only":
                output = values.getString(result.val[0], translated, references);
                break;
            case "last-only":
                output = values.getString(result.val[Object.keys(result.val).length - 1], translated, references);
                break;
            case "all":
                let i = 0;
                for(const vale in result.val) {
                    const res = values.getString(result.val[vale], translated, references);
                    if(res.length > 0) {
                        output += `Expression ${i}: ${res}\n`;
                    } else {
                        output += `No valid return value for expression ${i}`;
                    }
                    i++;
                }
                break;
            case "none":
                output = "Done!";
                break;
            default:
                output = "Error: invalid output format!";
        }
    }
    for(const key in referenceData.edited) {
        console.log(`Checking reference ${key}...`);
        if(referenceData.edited[key]) {
            removeReference(key, references, referenceData);
        }
    }
    delete referenceData.edited;
    try {
        await data.write(baseScope, "./cache/variables");
        await data.write(references, "./cache/references");
        await data.write(referenceData, "./cache/referenceData");
    } catch {
        output += "\n\nERROR: unable to write to variable scope!";
    }
    return output;
}