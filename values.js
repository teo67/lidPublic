class Value {
    constructor(type, val) {
        this.type = type;
        if(val !== null) {
            this.val = val;
        }
    }
}
const types = {
    NUMBER: 0, 
    STRING: 1, 
    BOOLEAN: 2, 
    ARRAY: 3, 
    NONE: 4,
    VARIABLE: 5,
    FUNCTION: 6,
    ARRAY_REFERENCE: 7,
    FUNCTION_REFERENCE: 8,
    ARRAY_ACCESS: 9
};
const getString = (val, scope, references) => {
    const value = breakAccess(breakReference(breakVariable(val, scope), references), references);
    switch(value.type) {
        case types.NUMBER:
            return `${value.val}`;
        case types.STRING:
            return value.val;
        case types.BOOLEAN:
            return value.val ? "true" : "false";
        case types.ARRAY:
            let returning = "[";
            let i = 0;
            for(const key in value.val) {
                if(key != `${i}`) {
                    returning += `.${key} = `;
                }
                returning += getString(value.val[key], scope, references);
                returning += ", ";
                i++;
            }
            if(i > 0) {
                returning = returning.substring(0, returning.length - 2);
            }
            return returning + "]";
        case types.FUNCTION:
            return "(Function)";
        default:
            return "none";
    }
}
const getNumber = value => {
    switch(value.type) {
        case types.NUMBER:
            return value.val;
        case types.STRING:
            const res = parseFloat(value.val);
            if(isNaN(res)) {
                throw `String ${value.val} could not be converted to a number!`;
            }
            return res;
        case types.BOOLEAN:
            return value.val ? 1 : 0;
        case types.ARRAY:
            throw "Unable to convert object to number!";
        case types.FUNCTION:
            throw "Unable to convert function to number!";
        default:
            return 0;
    }
}
const getBoolean = value => {
    switch(value.type) {
        case types.NUMBER:
            return value.val != 0.0;
        case types.STRING:
        case types.ARRAY:
        case types.FUNCTION:
            return true;
        case types.BOOLEAN:
            return value.val;
        default:
            return false;
    }
}
const getArray = value => {
    if(value.type == types.ARRAY) {
        return value.val;
    }
    throw "Expecting an object!";
}
const breakReference = (value, reference) => {
    if(value.type == types.ARRAY_REFERENCE) {
        return new Value(types.ARRAY, reference[value.val].val);
    }
    if(value.type == types.FUNCTION_REFERENCE) {
        return new Value(types.FUNCTION, reference[value.val].val);
    }
    return value;
}
const breakVariable = (value, scope) => {
    if(value.type == types.VARIABLE) {
        return breakVariable(scope.get(value.val), scope);
    }
    return value;
}
const breakAccess = (value, reference) => {
    if(value.type == types.ARRAY_ACCESS) {
        let arr = breakReference(value.val.arr, reference);
        if(arr.type != types.ARRAY) {
            throw `Unable to access element ${value.val.num} of a non-array item!`;
        }
        arr = arr.val;
        const val = arr[value.val.num];
        if(val === undefined) {
            throw `The object being accessed does not have a key for '${value.val.num}'!`;
        }
        return breakAccess(val, reference);
    }
    return value;
}
const equals = (a, b) => {
    return a.type == b.type && (a.type == types.NONE ? true : a.val == b.val);
}
module.exports = {
    Value, types, getString, getNumber, getBoolean, getArray, breakVariable, breakReference, breakAccess, equals
};