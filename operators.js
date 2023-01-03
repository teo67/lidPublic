const values = require('./values.js');
const createReference = require('./helpers/createReference.js');
const createOrAddOne = require('./helpers/createOrAddOne.js');
const deleteOrSubtractOne = require('./helpers/deleteOrSubtractOne.js');
const Scope = require('./scope.js');
class Operator {
    constructor(num, args) {
        this.num = num;
        if(args !== null) {
            this.args = args;
        }
    }
}
const operatorArray = {};
const basicOperatorArray = {};
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
    ACCESS: 14,
    SCOPE: 15,
    OBJECT: 16,
    WHILE: 17,
    EQUALS: 18, 
    LESSTHAN: 19,
    GREATERTHAN: 20, 
    LESSTHANOREQUALS: 21,
    GREATERTHANOREQUALS: 22,
    NOTEQUALS: 23,
    OPERATEASSIGN: 24,
    IF: 25,
    FOR: 26,
    AND: 27,
    OR: 28,
    POSTADD: 29,
    POSTSUBTRACT: 30,
    NOT: 31,
    NEGATIVE: 32,
    MODULO: 33,
    EXPONENT: 34,
    DOTACCESS: 35,
    FUNCTION: 36,
    FUNCTIONCALL: 37
};
const run = (op, scope, reference, referenceData, breakvar = true, breakref = true, breakaccess = true) => {
    const res = operatorArray[op.num](op.args, scope, reference, referenceData);
    const returning = breakvar ? values.breakVariable(res, scope) : res;
    const returning2 = breakaccess ? values.breakAccess(returning, reference) : returning;
    return breakref ? values.breakReference(returning2, reference) : returning2;
}
const addToBasicOperatorArray = (num, func) => {
    basicOperatorArray[num] = func;
    operatorArray[num] = (args, scope, reference, referenceData) => {
        return basicOperatorArray[num](run(args[0], scope, reference, referenceData), args[1], scope, reference, referenceData);
    }
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
const assign = (first, res, scope, reference, referenceData, givenScope = null) => {
    if(first.type != values.types.VARIABLE && first.type != values.types.ARRAY_ACCESS) {
        throw "Expecting a variable or property on the left side of an assignment expression!";
    }
    let previousContainer = null;
    let usesHolder = null;
    let val = null;
    if(first.type == values.types.VARIABLE) {
        let con = givenScope;
        if(con === null) {
            con = scope.getContaining(first.val);
        }
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
operatorArray[operatorTypes.ARRAY] = (args, scope, reference, referenceData) => {
    const returning = {};
    let i = 0;
    for(const arg of args) {
        returning[i] = run(arg, scope, reference, referenceData);
        i++;
    }
    return new values.Value(values.types.ARRAY, returning);
}
operatorArray[operatorTypes.SCOPE] = (args, scope, reference, referenceData) => {
    for(let i = 0; i < args.length - 1; i++) {
        run(args[i], scope, reference, referenceData);
    }
    return args.length == 0 ? new values.Value(values.types.NONE, null) : run(args[args.length - 1], scope, reference, referenceData);
}
addToBasicOperatorArray(operatorTypes.ADD, (a, _b, scope, reference, referenceData) => {
    const b = run(_b, scope, reference, referenceData);
    if(a.type == values.types.STRING) {
        return new values.Value(values.types.STRING, values.getString(a, scope, reference) + values.getString(b, scope, reference));
    }
    return new values.Value(values.types.NUMBER, values.getNumber(a) + values.getNumber(b));
});
addToBasicOperatorArray(operatorTypes.SUBTRACT, (a, _b, scope, reference, referenceData) => {
    const b = run(_b, scope, reference, referenceData);
    if(a.type == values.types.STRING) {
        const str = values.getString(a, scope, reference);
        return new values.Value(values.types.STRING, str.substring(0, str.length - values.getNumber(b)));
    }
    return new values.Value(values.types.NUMBER, values.getNumber(a) - values.getNumber(b));
});
addToBasicOperatorArray(operatorTypes.MULTIPLY, (a, _b, scope, reference, referenceData) => {
    const b = run(_b, scope, reference, referenceData);
    if(a.type == values.types.STRING) {
        return new values.Value(values.types.STRING, values.getString(a, scope, reference).repeat(values.getNumber(b)));
    }
    if(b.type == values.types.STRING) {
        return new values.Value(values.types.STRING, values.getString(b, scope, reference).repeat(values.getNumber(a)));
    }
    return new values.Value(values.types.NUMBER, values.getNumber(a) * values.getNumber(b));
});
addToBasicOperatorArray(operatorTypes.DIVIDE, (a, _b, scope, reference, referenceData) => {
    const b = run(_b, scope, reference, referenceData);
    return new values.Value(values.types.NUMBER, values.getNumber(a) / values.getNumber(b));
});
addToBasicOperatorArray(operatorTypes.MODULO, (a, _b, scope, reference, referenceData) => {
    const b = run(_b, scope, reference, referenceData);
    return new values.Value(values.types.NUMBER, values.getNumber(a) % values.getNumber(b));
});
addToBasicOperatorArray(operatorTypes.EXPONENT, (a, _b, scope, reference, referenceData) => {
    const b = run(_b, scope, reference, referenceData);
    return new values.Value(values.types.NUMBER, values.getNumber(a) ** values.getNumber(b));
});
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
    const first = run(args[0], scope, reference, referenceData, false, false, false);
    const second = run(args[1], scope, reference, referenceData, true, false);
    return assign(first, second, scope, reference, referenceData);
}
const breakVarWithScope = (first, scope, reference) => {
    let value = first;
    let givenScope = null;
    if(first.type == values.types.VARIABLE) { // basically break variable manually
        givenScope = scope.getContaining(first.val);
        if(givenScope === null) {
            throw `The variable ${first.val} does not exist!`;
        }
        value = givenScope.variables[first.val];
    }
    value = values.breakReference(values.breakAccess(value, reference), reference);
    return [value, givenScope];
}
operatorArray[operatorTypes.OPERATEASSIGN] = (args, scope, reference, referenceData) => {
    const first = run(args[0], scope, reference, referenceData, false, false, false);
    let value, givenScope = breakVarWithScope(first, scope, reference);
    value = basicOperatorArray[args[1]](value, args[2], scope, reference);
    return assign(first, value, scope, reference, referenceData, givenScope);
}
operatorArray[operatorTypes.POSTADD] = (args, scope, reference, referenceData) => {
    const first = run(args, scope, reference, referenceData, false, false, false);
    let [value, givenScope] = breakVarWithScope(first, scope, reference);
    const oldNumber = values.getNumber(value);
    value = new values.Value(values.types.NUMBER, oldNumber + 1);
    return assign(first, value, scope, reference, referenceData, givenScope);
}
operatorArray[operatorTypes.POSTSUBTRACT] = (args, scope, reference, referenceData) => {
    const first = run(args, scope, reference, referenceData, false, false, false);
    let [value, givenScope] = breakVarWithScope(first, scope, reference);
    const oldNumber = values.getNumber(value);
    value = new values.Value(values.types.NUMBER, oldNumber - 1);
    return assign(first, value, scope, reference, referenceData, givenScope);
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
operatorArray[operatorTypes.DOTACCESS] = (args, scope, reference, referenceData) => {
    const first = run(args[0], scope, reference, referenceData, true, false);
    if(first.type != values.types.ARRAY && first.type != values.types.ARRAY_REFERENCE) {
        throw `Expecting an object to access property via dotting!`;
    }
    return new values.Value(values.types.ARRAY_ACCESS, { arr: first, num: args[1] });
}
operatorArray[operatorTypes.OBJECT] = (args, scope, reference, referenceData) => {
    const obj = new values.Value(values.types.ARRAY, {});
    const _scope = new Scope(scope, obj.val, false);
    run(args, _scope, reference, referenceData);
    return obj;
}
operatorArray[operatorTypes.WHILE] = (args, scope, reference, referenceData) => {
    const returning = {};
    let i = 0;
    while(values.getBoolean(run(args[0], scope, reference, referenceData))) {
        returning[i] = run(args[1], new Scope(scope), reference, referenceData);
        i++;
    }
    return new values.Value(values.types.ARRAY, returning);
}
addToBasicOperatorArray(operatorTypes.EQUALS, (a, _b, scope, reference, referenceData) => {
    const b = run(_b, scope, reference, referenceData);
    return new values.Value(values.types.BOOLEAN, values.equals(a, b));
});
addToBasicOperatorArray(operatorTypes.NOTEQUALS, (a, _b, scope, reference, referenceData) => {
    const b = run(_b, scope, reference, referenceData);
    return new values.Value(values.types.BOOLEAN, !values.equals(a, b));
});
addToBasicOperatorArray(operatorTypes.LESSTHAN, (a, _b, scope, reference, referenceData) => {
    const b = run(_b, scope, reference, referenceData);
    return new values.Value(values.types.BOOLEAN, values.getNumber(a) < values.getNumber(b));
});
addToBasicOperatorArray(operatorTypes.GREATERTHAN, (a, _b, scope, reference, referenceData) => {
    const b = run(_b, scope, reference, referenceData);
    return new values.Value(values.types.BOOLEAN, values.getNumber(a) > values.getNumber(b));
});
addToBasicOperatorArray(operatorTypes.LESSTHANOREQUALS, (a, _b, scope, reference, referenceData) => {
    const b = run(_b, scope, reference, referenceData);
    return new values.Value(values.types.BOOLEAN, values.getNumber(a) <= values.getNumber(b));
});
addToBasicOperatorArray(operatorTypes.GREATERTHANOREQUALS, (a, _b, scope, reference, referenceData) => {
    const b = run(_b, scope, reference, referenceData);
    return new values.Value(values.types.BOOLEAN, values.getNumber(a) >= values.getNumber(b));
});
addToBasicOperatorArray(operatorTypes.AND, (a, _b, scope, reference, referenceData) => {
    if(!values.getBoolean(a)) {
        return a;
    }
    return run(_b, scope, reference, referenceData);
});
addToBasicOperatorArray(operatorTypes.OR, (a, _b, scope, reference, referenceData) => {
    if(values.getBoolean(a)) {
        return a;
    }
    return run(_b, scope, reference, referenceData);
});
operatorArray[operatorTypes.IF] = (args, scope, reference, referenceData) => {
    if(values.getBoolean(run(args[0], scope, reference, referenceData))) {
        return run(args[1], new Scope(scope), reference, referenceData);
    }
    if(args.length > 2) {
        return run(args[2], scope, reference, referenceData);
    }
    return new values.Value(values.types.NONE, null);
}
operatorArray[operatorTypes.FOR] = (args, scope, reference, referenceData) => {
    const outerScope = new Scope(scope);
    const returning = {};
    let i = 0;
    if(args[0].length > 0) {
        run(args[0][0], outerScope, reference, referenceData);
    }
    if(args[0].length > 1) {
        while(values.getBoolean(run(args[0][1], outerScope, reference, referenceData))) {
            const innerScope = new Scope(outerScope);
            returning[i] = run(args[1], innerScope, reference, referenceData);
            i++;
            if(args[0].length > 2) {
                run(args[0][2], outerScope, reference, referenceData);
            }
        }
    }
    return new values.Value(values.types.ARRAY, returning);
}
operatorArray[operatorTypes.NOT] = (args, scope, reference, referenceData) => {
    const a = run(args, scope, reference, referenceData);
    return new values.Value(values.types.BOOLEAN, !values.getBoolean(a));
}
operatorArray[operatorTypes.NEGATIVE] = (args, scope, reference, referenceData) => {
    const a = run(args, scope, reference, referenceData);
    return new values.Value(values.types.NUMBER, -values.getNumber(a));
}
operatorArray[operatorTypes.FUNCTION] = args => {
    return new values.Value(values.types.FUNCTION, { args: args[0], body: args[1] });
}
operatorArray[operatorTypes.FUNCTIONCALL] = (args, scope, reference, referenceData) => {
    const fun = run(args[0], scope, reference, referenceData, false, false, false);
    let [value, givenScope] = breakVarWithScope(fun, scope, reference);
    if(givenScope === null) {
        givenScope = scope;
    }
    const _scope = new Scope(givenScope);
    if(value.type != values.types.FUNCTION) {
        throw `Expecting a function!`;
    }
    if(args[1].length < value.val.args.length) {
        throw `The given function requires ${value.val.args.length} arguments, but only ${args[1].length} were provided!`;
    }
    for(let i = 0; i < value.val.args.length; i++) {
        _scope.variables[value.val.args[i]] = run(args[1][i], scope, reference, referenceData);
    }
    return run(value.val.body, _scope, reference, referenceData);
}
module.exports = { Operator, operatorArray, operatorTypes };