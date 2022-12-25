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
    NONE: 4
};
const getString = value => {
    switch(value.type) {
        case types.NUMBER:
            return `${value.val}`;
        case types.STRING:
            return value.val;
        case types.BOOLEAN:
            return value.val ? "true" : "false";
        case types.ARRAY:
            let returning = "[";
            for(let i = 0; i < value.val.length; i++) {
                returning += getString(value.val[i]);
                if(i != value.val.length - 1) {
                    returning += ", ";
                }
            }
            return returning + "]";
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
            throw "Unable to convert array to number!";
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
    throw "Expecting an array!";
}
module.exports = {
    Value, types, getString, getNumber, getBoolean, getArray
};