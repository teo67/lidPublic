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

    parse(lowerfunction, cases, type = TokenTypes.OPERATOR) {
        let current = this[lowerfunction]();
        let next = null;
        let done = false;
        while(!done) {
            next = this.next();
            done = true;
            if(next.type == type) {
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

    parseList(endsymbol = "]") {
        let returning = [];
        let next = this.next();
        while(next.type != TokenTypes.SYMBOL || next.raw != endsymbol) {
            if(next.type != TokenTypes.SYMBOL || next.raw != ",") {
                this.stored = next;
                const adding = this.parseAssignment();
                returning.push(adding);
            }
            next = this.next();
        }
        this.stored = next;
        return new operators.Operator(operators.operatorTypes.ARRAY, returning);
    }

    checkAssignment(raw, current, under) {
        if(raw.length > 0 && raw[raw.length - 1] == "=") {
            if(raw.length == 1) {
                return new operators.Operator(operators.operatorTypes.ASSIGNMENT, [current, this[under]()]);
            }
            const prev = raw.substring(0, raw.length - 1);
            const checkers = ["checkMultiples", "checkSums", "checkComparators"];
            let result = null;
            let i = 0;
            while(result == null) {
                result = this[checkers[i]](prev, null, under);
                i++;
            }
            if(result != null) {
                return new operators.Operator(operators.operatorTypes.OPERATEASSIGN, [current, result.num, result.args[1]]);
            }
        }
        return null;
    }

    parseAssignment() {
        return this.parse("parseComparators", "checkAssignment");
    }

    checkComparators(raw, current, under) {
        const key = {
            "==": operators.operatorTypes.EQUALS, 
            "<": operators.operatorTypes.LESSTHAN,
            ">": operators.operatorTypes.GREATERTHAN, 
            "<=": operators.operatorTypes.LESSTHANOREQUALS,
            ">=": operators.operatorTypes.GREATERTHANOREQUALS,
            "!=": operators.operatorTypes.NOTEQUALS
        };
        const type = key[raw];
        if(type === undefined) {
            return null;
        }
        return new operators.Operator(type, [current, this[under]()]);
    }

    parseComparators() {
        return this.parse("parseSums", "checkComparators");
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
        return this.parse("parseAccessors", "checkMultiples");
    }

    checkAccessors(raw, current, under) {
        if(raw == "[") {
            const returning = new operators.Operator(operators.operatorTypes.ACCESS, [current, this[under]()]);
            this.requireSymbol("]");
            return returning;
        }
        return null;
    }

    parseAccessors() {
        return this.parse("parseLowest", "checkAccessors", TokenTypes.SYMBOL);
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
                    const didOpen1 = this.optionalSymbol("(");
                    const condition1 = this.parseAssignment();
                    if(didOpen1) {
                        this.requireSymbol(")");
                    }
                    const didOpen2 = this.optionalSymbol("{");
                    const scope = didOpen2 ? this.parseExpressions() : this.parseAssignment();
                    if(didOpen2) {
                        this.requireSymbol("}");
                    }
                    return new operators.Operator(operators.operatorTypes.WHILE, [condition1, scope]);
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
                return res;
            }
            if(value.raw == "{") {
                const scope = this.parseExpressions();
                this.requireSymbol("}");
                return new operators.Operator(operators.operatorTypes.OBJECT, scope);
            }
        }
        throw `Unexpected token: ${value.raw}`;
    }
}

module.exports = Parser;