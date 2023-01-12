const Lex = require('../lex.js').Lex;
const Parser = require('../parsing.js');
const operators = require('../operators.js');
const values = require('../values.js');
const data = require('./data.js');
const Scope = require('../scope.js');

const removeReference = async (ref, references, referenceData) => {
    if(ref === null) {
        return false;
    }
    if(ref.usedBy == 0) {
        for(let [key, value] of ref.uses) {
            const found = await data.getReference(references, key);
            found.usedBy--;
            await removeReference(found, references, referenceData);
        }
        await ref.delete();
        return false;
    }
    return true;
}

module.exports = async (text, outputFormat) => {
    let baseScope;
    let references;
    let referenceData;
    try {
        baseScope = await data.read("./cache/variables", "{}");
        references = {};//await data.read("./cache/references", "{}");
        referenceData = await data.read("./cache/referenceData", "{}"/*"{\"next\": 0, \"stack\": [], \"baseUses\": {}}"*/);
        referenceData = new Map(Object.entries(referenceData)); // convert to map for now
    } catch {
        return "Error reading previous variable scope!";
    }
    const translated = new Scope(null, baseScope, true);
    let result;
    try {
        const lex = new Lex(text);
        const parser = new Parser(lex);
        const expr = parser.parseExpressions(false, null);
        result = await operators.operatorArray[expr.num](expr.args, translated, references, referenceData);
    } catch(e) {
        console.log(e);
        return `There was an error parsing your code: \n${e}`;
    }
    let output = "";
    if(result.type != values.types.ARRAY) {
        output = "Error: improper formatting";
    } else {
        switch(outputFormat) {
            case "first-only":
                output = await values.getString(result.val[0], translated, references);
                break;
            case "last-only":
                output = await values.getString(result.val[Object.keys(result.val).length - 1], translated, references);
                break;
            case "all":
                let i = 0;
                for(const vale in result.val) {
                    const res = await values.getString(result.val[vale], translated, references);
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
    try {
        for(const key in references) {
            const ref = references[key];
            //console.log(ref);
            if(await removeReference(ref, references, referenceData)) {
                await ref.save();
            }
            
        }
    } catch(e) {
        console.log(e);
        output += "\n\nERROR: unable to write to database!";
    }
    try {
        await data.write(baseScope, "./cache/variables");
        //await data.write(references, "./cache/references");
        referenceData = Object.fromEntries(referenceData); // convert back to plain object
        await data.write(referenceData, "./cache/referenceData");
    } catch {
        output += "\n\nERROR: unable to write to variable scope!";
    }
    return output;
}