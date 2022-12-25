const operators = require('./operators.js');
const TokenTypes = require('./lex.js').TokenTypes;
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

    parseExpressions() {
        const expressions = [];
        while(!this.lexer.over) {
            expressions.push(this.parseSums());
        }
        return new operators.Operator(operators.operatorTypes.ARRAY, expressions);
    }

    parse(lowerfunction, cases) {
        let current = this[lowerfunction]();
        let next = null;
        let done = false;
        while(!done) {
            next = this.next();
            done = true;
            if(next.type == TokenTypes.OPERATOR) {
                const result = this[cases](next.raw, current, lowerfunction);
                if(result != null) {
                    current = result;
                    done = false;
                }
            }
        }
        this.stored = next;
        return current;
    }

    checkSums(raw, current, under) {
        if(raw == "+") {
            return new operators.Operator(operators.operatorTypes.ADD, [current, this[under]()]);
        }
        if(raw == "-") {
            return new operators.Operator(operators.operatorTypes.SUBTRACT, [current, this[under]()]);
        }
        return null;
    }

    parseSums() {
        return this.parse("parseMultiples", "checkSums");
    }

    checkMultiples(raw, current, under) {
        if(raw == "*") {
            return new operators.Operator(operators.operatorTypes.MULTIPLY, [current, this[under]()]);
        }
        if(raw == "/") {
            return new operators.Operator(operators.operatorTypes.DIVIDE, [current, this[under]()]);
        }
        return null;
    }

    parseMultiples() {
        return this.parse("parseLowest", "checkMultiples");
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
            if(value.raw == "true" || value.raw == "false") {
                return new operators.Operator(operators.operatorTypes.BOOLEAN, value.raw == "true");
            }
            if(value.raw == "none") {
                return new operators.Operator(operators.operatorTypes.NONE, null);
            }
        }
        throw `Unexpected token: ${value.raw}`;
    }
}

module.exports = Parser;