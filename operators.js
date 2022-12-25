const values = require('./values.js');
class Operator {
    constructor(num, args) {
        this.num = num;
        if(args !== null) {
            this.args = args;
        }
    }
}
const operatorArray = [];
const operatorTypes = {
    ARRAY: 0,
    ADD: 1, 
    SUBTRACT: 2, 
    MULTIPLY: 3, 
    DIVIDE: 4,
    NUMBER: 5,
    STRING: 6, 
    BOOLEAN: 7,
    NONE: 9
};
const run = op => {
    return operatorArray[op.num](op.args);
}
operatorArray[operatorTypes.ARRAY] = args => {
    const returning = [];
    for(const arg of args) {
        returning.push(run(arg));
    }
    return new values.Value(values.types.ARRAY, returning);
}
operatorArray[operatorTypes.ADD] = args => {
    const a = run(args[0]);
    const b = run(args[1]);
    if(a.type == values.types.STRING) {
        return new values.Value(values.types.STRING, values.getString(a) + values.getString(b));
    }
    return new values.Value(values.types.NUMBER, values.getNumber(a) + values.getNumber(b));
}
operatorArray[operatorTypes.SUBTRACT] = args => {
    const a = run(args[0]);
    const b = run(args[1]);
    if(a.type == values.types.STRING) {
        const str = values.getString(a);
        return new values.Value(values.types.STRING, str.substring(0, str.length - values.getNumber(b)));
    }
    return new values.Value(values.types.NUMBER, values.getNumber(a) - values.getNumber(b));
}
operatorArray[operatorTypes.MULTIPLY] = args => {
    const a = run(args[0]);
    const b = run(args[1]);
    if(a.type == values.types.STRING) {
        return new values.Value(values.types.STRING, values.getString(a).repeat(values.getNumber(b)));
    }
    if(b.type == values.types.STRING) {
        return new values.Value(values.types.STRING, values.getString(b).repeat(values.getNumber(a)));
    }
    return new values.Value(values.types.NUMBER, values.getNumber(a) * values.getNumber(b));
}
operatorArray[operatorTypes.DIVIDE] = args => {
    const a = run(args[0]);
    const b = run(args[1]);
    return new values.Value(values.types.NUMBER, values.getNumber(a) / values.getNumber(b));
}
operatorArray[operatorTypes.NUMBER] = args => {
    return new values.Value(values.types.NUMBER, args);
}
operatorArray[operatorTypes.STRING] = args => {
    return new values.Value(values.types.STRING, args);
}
operatorArray[operatorTypes.BOOLEAN] = args => {
    return new values.Value(values.types.BOOLEAN, args);
}
operatorArray[operatorTypes.NONE] = () => {
    return new values.Value(values.types.NONE, null);
}
module.exports = {Operator, operatorArray, operatorTypes};