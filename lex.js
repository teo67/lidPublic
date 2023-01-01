class Entry {
    constructor(type, raw) {
        this.type = type;
        this.raw = raw;
    }
}

const tokens = {};
const alphabet = "abcdefghijklmnopqrstuvwxyz";
const numbers = "0123456789";
const symbols = "()[]{},'";
const operators = "+-*/=!|&";
const whitespace = " \t\n\r\xa0";
const Token = {
    LETTER: 0, DIGIT: 1, SYMBOL: 2, OPERATOR: 3, WHITESPACE: 4, QUOTE: 5, DOT: 6
};
for(const letter of alphabet) {
    tokens[letter] = Token.LETTER;
    tokens[letter.toUpperCase()] = Token.LETTER;
}
for(const number of numbers) {
    tokens[number] = Token.DIGIT;
}
for(const symbol of symbols) {
    tokens[symbol] = Token.SYMBOL;
}
for(const operator of operators) {
    tokens[operator] = Token.OPERATOR;
}
for(const char of whitespace) {
    tokens[char] = Token.WHITESPACE;
}
tokens['"'] = Token.QUOTE;
tokens["."] = Token.DOT;
const TokenTypes = {
    KEYWORD: 0, STRING: 1, NUMBER: 2, SYMBOL: 3, OPERATOR: 4, SAME: 5, NONE: 6
};
// done with setup

const getNextToken = (previousType, previousRaw, nextSymbol) => {
    if(previousType == TokenTypes.STRING) {
        if(previousRaw.indexOf("\"") == previousRaw.lastIndexOf("\"")) {
            return TokenTypes.SAME;
        }
    }
    switch(nextSymbol) {
        case Token.LETTER:
            return (previousType == TokenTypes.KEYWORD) ? TokenTypes.SAME : TokenTypes.KEYWORD;
        case Token.DIGIT:
            return (previousType == TokenTypes.KEYWORD || previousType == TokenTypes.NUMBER) ? TokenTypes.SAME : TokenTypes.NUMBER;
        case Token.SYMBOL:
            return TokenTypes.SYMBOL;
        case Token.OPERATOR:
            return (previousType == TokenTypes.OPERATOR) ? TokenTypes.SAME : TokenTypes.OPERATOR;
        case Token.WHITESPACE:
            return TokenTypes.NONE;
        case Token.QUOTE:
            return (previousType == TokenTypes.STRING) ? TokenTypes.SAME : TokenTypes.STRING;
        case Token.DOT:
            return (previousType == TokenTypes.NUMBER) ? TokenTypes.SAME : TokenTypes.SYMBOL;
    }
}

class Lex {
    constructor(text) {
        this.text = text;
        this.index = 0;
        this.over = text.length == 0;
    }
    lex() {
        let current = "";
        let currentType = TokenTypes.NONE;
        while(this.index < this.text.length) {
            const nextRead = this.text[this.index];
            const nextType = tokens[nextRead];
            if(nextType === undefined) {
                throw `Unrecognized token: ${nextRead}`;
            }
            const nextToken = getNextToken(currentType, current, nextType);
            if(nextToken != TokenTypes.SAME) {
                if(currentType != TokenTypes.NONE) {
                    return new Entry(currentType, current);
                }
                current = "";
                currentType = nextToken;
            }
            current += nextRead;
            this.index++;
        }
        if(currentType == TokenTypes.NONE) {
            this.over = true;
        }
        return new Entry(currentType, current);
    }
}

module.exports = {Entry, TokenTypes, Lex};