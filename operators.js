const values = require('./values.js');
const createReference = require('./helpers/createReference.js');
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
    NONE: 9,
    REFERENCE: 10, 
    ASSIGNMENT: 11,
    DELETE: 12
};
const run = (op, scope, reference, referenceData, breakvar = true, breakref = true) => {
    const res = operatorArray[op.num](op.args, scope, reference, referenceData);
    const returning = breakvar ? values.breakVariable(res, scope) : res;
    return breakref ? values.breakReference(returning, reference) : returning;
}
operatorArray[operatorTypes.ARRAY] = (args, scope, reference, referenceData) => {
    const returning = [];
    for(const arg of args) {
        returning.push(run(arg, scope, reference, referenceData));
    }
    return new values.Value(values.types.ARRAY, returning);
}
operatorArray[operatorTypes.ADD] = (args, scope, reference, referenceData) => {
    const a = run(args[0], scope, reference, referenceData);
    const b = run(args[1], scope, reference, referenceData);
    if(a.type == values.types.STRING) {
        return new values.Value(values.types.STRING, values.getString(a) + values.getString(b));
    }
    return new values.Value(values.types.NUMBER, values.getNumber(a) + values.getNumber(b));
}
operatorArray[operatorTypes.SUBTRACT] = (args, scope, reference, referenceData) => {
    const a = run(args[0], scope, reference, referenceData);
    const b = run(args[1], scope, reference, referenceData);
    if(a.type == values.types.STRING) {
        const str = values.getString(a);
        return new values.Value(values.types.STRING, str.substring(0, str.length - values.getNumber(b)));
    }
    return new values.Value(values.types.NUMBER, values.getNumber(a) - values.getNumber(b));
}
operatorArray[operatorTypes.MULTIPLY] = (args, scope, reference, referenceData) => {
    const a = run(args[0], scope, reference, referenceData);
    const b = run(args[1], scope, reference, referenceData);
    if(a.type == values.types.STRING) {
        return new values.Value(values.types.STRING, values.getString(a).repeat(values.getNumber(b)));
    }
    if(b.type == values.types.STRING) {
        return new values.Value(values.types.STRING, values.getString(b).repeat(values.getNumber(a)));
    }
    return new values.Value(values.types.NUMBER, values.getNumber(a) * values.getNumber(b));
}
operatorArray[operatorTypes.DIVIDE] = (args, scope, reference, referenceData) => {
    const a = run(args[0], scope, reference, referenceData);
    const b = run(args[1], scope, reference, referenceData);
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
operatorArray[operatorTypes.REFERENCE] = args => {
    return new values.Value(values.types.VARIABLE, args); // should be of type value
}
operatorArray[operatorTypes.ASSIGNMENT] = (args, scope, reference, referenceData) => {
    const first = run(args[0], scope, reference, referenceData, false, false); // DO NOT BREAK VAR
    if(first.type != values.types.VARIABLE) {
        throw "Expecting a variable on the left side of an assignment expression!";
    }
    let previousContainer = scope.getContaining(first.val);
    let res = run(args[1], scope, reference, referenceData, true, false);
    if(scope.special) {
        if(res.type == values.types.ARRAY || res.type == values.types.FUNCTION) {
            const refnum = createReference(reference, referenceData, res.val);
            res.type = (res.type == values.types.ARRAY) ? values.types.ARRAY_REFERENCE : values.types.FUNCTION_REFERENCE;
            res.val = refnum; // actively edit the res object instead of changing the variable because this needs to change all other similar flat arrays to references
        }
        if(res.type == values.types.ARRAY_REFERENCE || res.type == values.types.FUNCTION_REFERENCE) {
            reference[res.val].num++;
        }
    }
    
    if(previousContainer !== null) {
        if(previousContainer.special) {
            const previousValue = previousContainer.variables[first.val];
            if(previousValue.type == values.types.ARRAY_REFERENCE || previousValue.type == values.types.FUNCTION_REFERENCE) {
                if(--reference[previousValue.val].num == 0) {
                    referenceData.edited.push(previousValue.val);
                }
            }
        }
        previousContainer.variables[first.val] = res;
    } else {
        scope.set(first.val, res);
    }
    return first;
}
operatorArray[operatorTypes.DELETE] = (args, scope, reference, referenceData) => {
    const container = scope.getContaining(args);
    if(container === null) {
        throw `Variable ${args} could not be deleted because it does not exist!`;
    }
    const removed = container.variables[args];
    if(container.special && (removed.type == values.types.ARRAY_REFERENCE || removed.type == values.types.FUNCTION_REFERENCE)) {
        if(--reference[removed.val].num == 0) {
            referenceData.edited.push(removed.val);
        }
    }
    delete container.variables[args];
    return removed;
}
module.exports = {Operator, operatorArray, operatorTypes};