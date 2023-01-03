const operators = require('./operators.js');
const TokenTypes = require('./lex.js').TokenTypes;
const basicOperations = [
    {
        "&&": operators.operatorTypes.AND,
        "||": operators.operatorTypes.OR
    },
    {
        "==": operators.operatorTypes.EQUALS, 
        "<": operators.operatorTypes.LESSTHAN,
        ">": operators.operatorTypes.GREATERTHAN, 
        "<=": operators.operatorTypes.LESSTHANOREQUALS,
        ">=": operators.operatorTypes.GREATERTHANOREQUALS,
        "!=": operators.operatorTypes.NOTEQUALS
    },
    {
        "+": operators.operatorTypes.ADD, 
        "-": operators.operatorTypes.SUBTRACT,
    },
    {
        "*": operators.operatorTypes.MULTIPLY,
        "/": operators.operatorTypes.DIVIDE,
        "%": operators.operatorTypes.MODULO
    },
    {
        "**": operators.operatorTypes.EXPONENT
    }
];
class Parser {
    constructor(lex) {
        this.lexer = lex;
        this.stored = null;
    }
    next() {
        if(this.stored != null) {
            const saved = this.stored;
            this.stored = null;
            return saved;
        }
        const returning = this.lexer.lex();
        //console.log(returning);
        return returning;
    }

    requireSymbol(symbol) {
        const next = this.next();
        if(next.type != TokenTypes.SYMBOL || next.raw != symbol) {
            throw `Expecting '${symbol}'!`;
        }
    }

    optionalSymbol(symbol) {
        const next = this.next();
        if(next.type == TokenTypes.SYMBOL && next.raw == symbol) {
            return true;
        }
        this.stored = next;
        return false;
    }

    parseExpressions(scope = true, endsymbol = "}") {
        const expressions = [];
        let next = this.next();
        while(!this.lexer.over && !(next.type == TokenTypes.SYMBOL && next.raw == endsymbol)) {
            this.stored = next;
            expressions.push(this.parseAssignment());
            next = this.next();
        }
        this.stored = next;
        return new operators.Operator(scope ? operators.operatorTypes.SCOPE : operators.operatorTypes.ARRAY, expressions);
    }

    parse(i = 0, lowerfunction = null, cases = null, type = TokenTypes.OPERATOR) {
        if(i >= basicOperations.length && lowerfunction === null) {
            return this.parsePre();
        }
        let current = lowerfunction === null ? this.parse(i + 1) : this[lowerfunction]();
        let next = null;
        let done = false;
        while(!done) {
            next = this.next();
            done = true;
            if(next.type == type) {
                let result = null;
                if(lowerfunction === null) {
                    const typ = basicOperations[i][next.raw];
                    if(typ !== undefined) {
                        result = new operators.Operator(typ, [current, this.parse(i + 1)]);
                    }
                } else {
                    result = this[cases](next.raw, current, lowerfunction);
                }
                if(result !== null) {
                    current = result;
                    done = false;
                }
            }
        }
        this.stored = next;
        return current;
    }

    parseList(endsymbol = "]", maxlen = -1, isfun = false) {
        let returning = [];
        let next = this.next();
        while(next.type != TokenTypes.SYMBOL || next.raw != endsymbol) {
            if(next.type != TokenTypes.SYMBOL || next.raw != ",") {
                if(isfun) {
                    returning.push(next.raw);
                } else {
                    this.stored = next;
                    const adding = this.parseAssignment();
                    returning.push(adding);
                }
            }
            next = this.next();
            if(returning.length == maxlen) {
                break;
            }
        }
        this.stored = next;
        return returning;
    }

    checkAssignment(raw, current, under) {
        if(raw.length > 0 && raw[raw.length - 1] == "=") {
            if(raw.length == 1) {
                return new operators.Operator(operators.operatorTypes.ASSIGNMENT, [current, this[under]()]);
            }
            const prev = raw.substring(0, raw.length - 1);
            let result = undefined;
            let i = 0;
            while(result === undefined) {
                result = basicOperations[i][prev];
                i++;
            }
            if(result !== undefined) {
                return new operators.Operator(operators.operatorTypes.OPERATEASSIGN, [current, result, this[under]()]);
            }
        }
        return null;
    }

    parseAssignment() {
        return this.parse(-1, "parse", "checkAssignment");
    }

    parsePre() {
        let next = this.next();
        if(next.type == TokenTypes.OPERATOR) {
            if(next.raw == "!") {
                return new operators.Operator(operators.operatorTypes.NOT, this.parsePre());
            }
            if(next.raw == "-") {
                return new operators.Operator(operators.operatorTypes.NEGATIVE, this.parsePre());
            }
        }
        this.stored = next;
        return this.parsePost();
    }

    parsePost() {
        let current = this.parse(-1, "parseLowest", "checkAccessors", TokenTypes.SYMBOL);
        let next = null;
        let done = false;
        while(!done) {
            next = this.next();
            if(next.type == TokenTypes.OPERATOR) {
                if(next.raw == "++") {
                    current = new operators.Operator(operators.operatorTypes.POSTADD, current);
                    continue;
                }
                if(next.raw == "--") {
                    current = new operators.Operator(operators.operatorTypes.POSTSUBTRACT, current);
                    continue;
                }
            }
            done = true;
        }
        this.stored = next;
        return current;
    }

    checkAccessors(raw, current, under) {
        if(raw == "[") {
            const returning = new operators.Operator(operators.operatorTypes.ACCESS, [current, this[under]()]);
            this.requireSymbol("]");
            return returning;
        }
        if(raw == ".") {
            return new operators.Operator(operators.operatorTypes.DOTACCESS, [current, this.next().raw]);
        }
        if(raw == "(") {
            const li = this.parseList(")");
            const returning = new operators.Operator(operators.operatorTypes.FUNCTIONCALL, [current, li]);
            this.requireSymbol(")");
            return returning;
        }
        return null;
    }

    parseScope() {
        const didOpen2 = this.optionalSymbol("{");
        const scope = didOpen2 ? this.parseExpressions() : this.parseAssignment();
        if(didOpen2) {
            this.requireSymbol("}");
        }
        return scope;
    }

    parseScopedExpression(num) {
        const condition1 = this.parseAssignment();
        return new operators.Operator(num, [condition1, this.parseScope()]);
    }

    parseIfs() {
        const original = this.parseScopedExpression(operators.operatorTypes.IF);
        const next = this.next();
        if(next.type == TokenTypes.KEYWORD && next.raw == "else") {
            const bracket = this.optionalSymbol("{");
            if(bracket) {
                original.args.push(this.parseExpressions());
                this.requireSymbol("}");
            } else {
                const after = this.next();
                if(after.type == TokenTypes.KEYWORD && after.raw == "if") {
                    original.args.push(this.parseIfs());
                } else {
                    this.stored = after;
                    original.args.push(this.parseAssignment());
                }
            }
        } else {
            this.stored = next;
        }
        return original;
    }

    parseLowest() {
        const value = this.next();
        if(value.type == TokenTypes.NUMBER) {
            const flo = parseFloat(value.raw);
            if(isNaN(flo)) {
                throw `Invalid number: ${value.raw}`;
            }
            return new operators.Operator(operators.operatorTypes.NUMBER, flo);
        }
        if(value.type == TokenTypes.STRING) {
            if(value.raw[0] != '"' || value.raw[value.raw.length - 1] != '"') {
                throw "Strings must start and end with quotation marks!";
            }
            return new operators.Operator(operators.operatorTypes.STRING, value.raw.substring(1, value.raw.length - 1)); // cut off quotes
        }
        if(value.type == TokenTypes.KEYWORD) {
            switch(value.raw) {
                case "true":
                case "false":
                    return new operators.Operator(operators.operatorTypes.BOOLEAN, value.raw == "true");
                case "none":
                    return new operators.Operator(operators.operatorTypes.NONE, null);
                case "delete":
                    const _next = this.next().raw;
                    return new operators.Operator(operators.operatorTypes.DELETE, _next);
                case "make":
                    const next = this.next().raw;
                    return new operators.Operator(operators.operatorTypes.MAKE, next);
                case "while":
                    return this.parseScopedExpression(operators.operatorTypes.WHILE);
                case "if":
                    return this.parseIfs();
                case "for":
                    const didOpen1 = this.optionalSymbol("(");
                    const li = this.parseList(didOpen1 ? ")" : null, 3);
                    if(didOpen1) {
                        this.requireSymbol(")");
                    }
                    const sco = this.parseScope();
                    return new operators.Operator(operators.operatorTypes.FOR, [li, sco]);
                default:
                    return new operators.Operator(operators.operatorTypes.REFERENCE, value.raw);
            }
        }
        if(value.type == TokenTypes.SYMBOL) {
            if(value.raw == "(") {
                const res = this.parseAssignment();
                this.requireSymbol(")");
                return res;
            }
            if(value.raw == "[") {
                const res = this.parseList();
                this.requireSymbol("]");
                return new operators.Operator(operators.operatorTypes.ARRAY, res);
            }
            if(value.raw == "{") {
                const scope = this.parseExpressions();
                this.requireSymbol("}");
                return new operators.Operator(operators.operatorTypes.OBJECT, scope);
            }
            if(value.raw == "#") {
                const li = this.parseList("#", -1, true);
                this.requireSymbol("#");
                const sco = this.parseScope();
                return new operators.Operator(operators.operatorTypes.FUNCTION, [li, sco]);
            }
        }
        throw `Unexpected token: ${value.raw}`;
    }
}

module.exports = Parser;