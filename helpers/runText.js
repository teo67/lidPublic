const Lex = require('../lex.js').Lex;
const Parser = require('../parsing.js');
const operators = require('../operators.js');
const values = require('../values.js');
const data = require('./data.js');
const Scope = require('../scope.js');
const _scope = require('../models/scope.js');

const removeReference = async (ref, references) => {
    if(ref === null) {
        return false;
    }
    if(ref.usedBy == 0) {
        for(let [key, _] of ref.uses) {
            const found = await data.getReference(references, key);
            found.usedBy--;
            await removeReference(found, references);
        }
        await ref.delete();
        return false;
    }
    return true;
}

const createWithIDAndVariables = (model, id) => {
    return new model({
        _id: id,
        variables: new Map()
    });
}

const trySave = async doc => {
    if(doc != null) {
        await doc.save();
    }
}

module.exports = async (text, outputFormat, scope, interaction) => {
    if(!['public', 'private', 'global'].includes(scope)) {
        return "Error: visibility must be private, public, or global.";
    }
    const scopes = {
        private: null,
        public: null,
        global: null,
        privateDoc: null,
        publicDoc: null,
        globalDoc: null,
        async getprivate() {
            if(this.private) {
                return this.private;
            }
            this.privateDoc = await data.load(_scope.Private, interaction.user.id);
            if(this.privateDoc == null) {
                this.privateDoc = createWithIDAndVariables(_scope.Private, interaction.user.id);
            }
            this.private = new Scope(await this.getpublic(), this.privateDoc.variables, true);
            return this.private;
        },
        async getpublic() {
            if(this.public) {
                return this.public;
            }
            this.publicDoc = await data.load(_scope.Public, interaction.guildId);
            if(this.publicDoc == null) {
                this.publicDoc = createWithIDAndVariables(_scope.Public, interaction.user.id);
            }
            this.public = new Scope(await this.getglobal(), this.publicDoc.variables, true);
            return this.public;
        },
        async getglobal() {
            if(this.global) {
                return this.global;
            }
            this.globalDoc = await data.load(_scope.Global);
            if(this.globalDoc == null) {
                this.globalDoc = new _scope.Global({
                    variables: {},
                    uses: {}
                });
            }
            this.global = new Scope(null, this.globalDoc.variables, true);
            return this.global;
        }
    };
    let references = {};
    let translated;
    try {
        translated = await scopes["get" + scope]();
    } catch {
        return "Error reading previous variable scope!";
    }
    let result;
    let parser;
    try {
        const lex = new Lex(text);
        parser = new Parser(lex, scopes);
        const expr = parser.parseExpressions(false, null);
        result = await operators.operatorArray[expr.num](expr.args, translated, references, scopes.globalDoc.uses);
    } catch(e) {
        //console.log(e);
        return `There was an error parsing your code: \n${e}`;
    }
    if(result.type != values.types.ARRAY) {
        parser.output = "Error: improper formatting";
    } else {
        if(parser.output.length > 0) {
            parser.output += "--------\n";
        }
        switch(outputFormat) {
            case "first-only":
                parser.output += await values.breakAndGetString(result.val[0], translated, references);
                break;
            case "last-only":
                parser.output += await values.breakAndGetString(result.val[Object.keys(result.val).length - 1], translated, references);
                break;
            case "all":
                let i = 0;
                for(const vale in result.val) {
                    const res = await values.breakAndGetString(result.val[vale], translated, references);
                    if(res.length > 0) {
                        parser.output += `Expression ${i}: ${res}\n`;
                    } else {
                        parser.output += `No valid return value for expression ${i}`;
                    }
                    i++;
                }
                break;
            case "none":
                parser.output += "Done!";
                break;
            default:
                parser.output += "Error: invalid output format!";
        }
    }
    try {
        for(const key in references) {
            const ref = references[key];
            //console.log(ref);
            if(await removeReference(ref, references)) {
                await ref.save();
            }
        }
        await trySave(scopes.privateDoc);
        await trySave(scopes.publicDoc);
        await trySave(scopes.globalDoc);
    } catch(e) {
        console.log(e);
        parser.output += "\n\nERROR: unable to write to database!";
    }
    return parser.output;
}