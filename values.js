const data = require('./helpers/data.js');
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
const type = val => {
    const inst = typeof val;
    if(inst === 'number') {
        return types.NUMBER;
    }
    if(inst === 'string') {
        return types.STRING;
    }
    if(inst === 'boolean') {
        return types.BOOLEAN;
    }
    if(val === null) {
        return types.NONE;
    }
    return val.type;
}
const breakAndGetString = async (val, scope, references) => {
    const value = await breakAccess(await breakReference(breakVariable(val, scope), references), references);
    return await getString(value, scope, references);
}
const getString = async (value, scope, references, typ = null) => {
    if(typ === null) {
        typ = type(value);
    }
    switch(typ) {
        case types.NUMBER:
            return `${value}`;
        case types.STRING:
            return value;
        case types.BOOLEAN:
            return value ? "true" : "false";
        case types.ARRAY:
            let returning = "[";
            let i = 0;
            for(const key in value.val) {
                if(key != `${i}`) {
                    returning += `.${key} = `;
                }
                returning += await breakAndGetString(value.val[key], scope, references);
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
const getNumber = (value, typ = null) => {
    if(typ === null) {
        typ = type(value);
    }
    switch(typ) {
        case types.NUMBER:
            return value;
        case types.STRING:
            const res = parseFloat(value);
            if(isNaN(res)) {
                throw `String ${value} could not be converted to a number!`;
            }
            return res;
        case types.BOOLEAN:
            return value ? 1 : 0;
        case types.ARRAY:
            throw "Unable to convert object to number!";
        case types.FUNCTION:
            throw "Unable to convert function to number!";
        default:
            return 0;
    }
}
const getBoolean = value => {
    switch(type(value)) {
        case types.NUMBER:
            return value != 0.0;
        case types.STRING:
        case types.ARRAY:
        case types.FUNCTION:
            return true;
        case types.BOOLEAN:
            return value;
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
const breakReference = async (value, reference) => {
    if(value.type == types.ARRAY_REFERENCE) {
        return new Value(types.ARRAY, (await data.getReference(reference, value.val)).val);
    }
    if(value.type == types.FUNCTION_REFERENCE) {
        return new Value(types.FUNCTION, (await data.getReference(reference, value.val)).val);
    }
    return value;
}
const breakVariable = (value, scope) => {
    if(value.type == types.VARIABLE) {
        const sco = value.scope ?? scope;
        return breakVariable(sco.get(value.val), sco);
    }
    return value;
}
const breakAccess = async (value, reference) => {
    if(value.type == types.ARRAY_ACCESS) {
        let arr = await breakReference(value.arr, reference);
        if(arr.type != types.ARRAY) {
            throw `Unable to access element ${value.num} of a non-array item!`;
        }
        arr = arr.val;
        const val = arr[value.num];
        if(val === undefined) {
            throw `The object being accessed does not have a key for '${value.num}'!`;
        }
        return await breakAccess(val, reference);
    }
    return value;
}
const equals = (a, b) => {
    if(a.val !== undefined) {
        return b.val !== undefined && a.type == b.type;
    }
    return a == b;
}
module.exports = {
    Value, types, getString, getNumber, getBoolean, getArray, breakVariable, breakReference, breakAccess, equals, type, breakAndGetString
};