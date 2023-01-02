const values = require('./values.js');
const createReference = require('./helpers/createReference.js');
const createOrAddOne = require('./helpers/createOrAddOne.js');
const deleteOrSubtractOne = require('./helpers/deleteOrSubtractOne.js');
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
    DELETE: 12,
    MAKE: 13,
    ACCESS: 14
};
const MAIN_SCOPE = -1;
const run = (op, scope, reference, referenceData, breakvar = true, breakref = true, breakaccess = true) => {
    const res = operatorArray[op.num](op.args, scope, reference, referenceData);
    const returning = breakvar ? values.breakVariable(res, scope) : res;
    const returning2 = breakref ? values.breakReference(returning, reference) : returning;
    return breakaccess ? values.breakAccess(returning2, reference) : returning2;
}
const handleArray = (arr, references, referenceData) => {
    if(arr.type == values.types.ARRAY_REFERENCE || arr.type == values.types.FUNCTION_REFERENCE) {
        return arr.val;
    }
    if(arr.type == values.types.ARRAY || arr.type == values.types.FUNCTION) {
        const refnum = createReference(references, referenceData, arr.val);
        const previousValue = arr.val;
        arr.val = refnum;
        if(arr.type == values.types.ARRAY) {
            arr.type = values.types.ARRAY_REFERENCE;
            for(const item in previousValue) {
                const refNo = handleArray(previousValue[item], references, referenceData);
                if(refNo == -1) {
                    continue;
                }
                createOrAddOne(references[refnum].uses, refNo);
                references[refNo].usedBy++;
                if(referenceData.edited[refNo]) {
                    delete referenceData.edited[refNo];
                }
            }
        } else {
            arr.type = values.types.FUNCTION_REFERENCE;
        }
        return refnum;
    }
    return -1;
}
operatorArray[operatorTypes.ARRAY] = (args, scope, reference, referenceData) => {
    const returning = {};
    let i = 0;
    for(const arg of args) {
        returning[i] = run(arg, scope, reference, referenceData);
        i++;
    }
    return new values.Value(values.types.ARRAY, returning);
}
operatorArray[operatorTypes.ADD] = (args, scope, reference, referenceData) => {
    const a = run(args[0], scope, reference, referenceData);
    const b = run(args[1], scope, reference, referenceData);
    if(a.type == values.types.STRING) {
        return new values.Value(values.types.STRING, values.getString(a, scope, reference) + values.getString(b, scope, reference));
    }
    return new values.Value(values.types.NUMBER, values.getNumber(a) + values.getNumber(b));
}
operatorArray[operatorTypes.SUBTRACT] = (args, scope, reference, referenceData) => {
    const a = run(args[0], scope, reference, referenceData);
    const b = run(args[1], scope, reference, referenceData);
    if(a.type == values.types.STRING) {
        const str = values.getString(a, scope, reference);
        return new values.Value(values.types.STRING, str.substring(0, str.length - values.getNumber(b)));
    }
    return new values.Value(values.types.NUMBER, values.getNumber(a) - values.getNumber(b));
}
operatorArray[operatorTypes.MULTIPLY] = (args, scope, reference, referenceData) => {
    const a = run(args[0], scope, reference, referenceData);
    const b = run(args[1], scope, reference, referenceData);
    if(a.type == values.types.STRING) {
        return new values.Value(values.types.STRING, values.getString(a, scope, reference).repeat(values.getNumber(b)));
    }
    if(b.type == values.types.STRING) {
        return new values.Value(values.types.STRING, values.getString(b, scope, reference).repeat(values.getNumber(a)));
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
    const first = run(args[0], scope, reference, referenceData, false, false, false); // DO NOT BREAK VAR
    if(first.type != values.types.VARIABLE && first.type != values.types.ARRAY_ACCESS) {
        throw "Expecting a variable or property on the left side of an assignment expression!";
    }
    let previousContainer = null;
    let usesHolder = null;
    let val = null;
    if(first.type == values.types.VARIABLE) {
        let con = scope.getContaining(first.val);
        if(con === null) {
            con = scope;
        }
        previousContainer = con.variables;
        usesHolder = con.special ? referenceData.baseUses: null;
        val = first.val;
    } else {
        if(first.val.arr.type == values.types.ARRAY_REFERENCE) {
            previousContainer = reference[first.val.arr.val].val;
            usesHolder = reference[first.val.arr.val].uses;
        } else {
            previousContainer = first.val.arr.val;
        }
        val = first.val.num;
    } 
    let res = run(args[1], scope, reference, referenceData, true, false);
    const previousValue = previousContainer[val];
    if(previousValue !== undefined) {
        if(usesHolder !== null) {
            if(previousValue.type == values.types.ARRAY_REFERENCE || previousValue.type == values.types.FUNCTION_REFERENCE) {
                deleteOrSubtractOne(usesHolder, previousValue.val);
                if(--reference[previousValue.val].usedBy == 0) {
                    referenceData.edited[previousValue.val] = true;
                }
            }
        }
    }
    previousContainer[val] = res;
    if(usesHolder !== null) {
        handleArray(res, reference, referenceData);
        if(res.type == values.types.ARRAY_REFERENCE || res.type == values.types.FUNCTION_REFERENCE) {
            createOrAddOne(usesHolder, res.val);
            reference[res.val].usedBy++;
            if(referenceData.edited[res.val]) {
                delete referenceData.edited[res.val]; // only change from true to false
            }
        }
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
        deleteOrSubtractOne(referenceData.baseUses, removed.val);
        if(--reference[removed.val].usedBy == 0) {
            referenceData.edited[removed.val] = true;
        }
    }
    delete container.variables[args];
    return removed;
}
operatorArray[operatorTypes.MAKE] = (args, scope) => {
    scope.set(args, new values.Value(values.types.NONE, null));
    return new values.Value(values.types.VARIABLE, args);
}
operatorArray[operatorTypes.ACCESS] = (args, scope, reference, referenceData) => {
    const first = run(args[0], scope, reference, referenceData, true, false);
    const second = run(args[1], scope, reference, referenceData);
    if(first.type != values.types.ARRAY && first.type != values.types.ARRAY_REFERENCE) {
        throw `Expecting an object to access property via brackets!`;
    }
    const secondNum = values.getString(second);
    return new values.Value(values.types.ARRAY_ACCESS, { arr: first, num: secondNum });
}
module.exports = {Operator, operatorArray, operatorTypes, MAIN_SCOPE};