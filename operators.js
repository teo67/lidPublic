const values = require('./values.js');
const data = require('./helpers/data.js');
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
    VALUE: 5,
    SCOPEDREFERENCE: 6,
    PRINT: 7,
    //8 - 9 available
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
    FUNCTIONCALL: 37,
};
const run = async (op, scope, reference, referenceData, breakvar = true, breakref = true, breakaccess = true) => {
    const res = await operatorArray[op.num](op.args, scope, reference, referenceData);
    const returning = breakvar ? values.breakVariable(res, scope) : res;
    const returning2 = breakaccess ? await values.breakAccess(returning, reference) : returning;
    return breakref ? (await values.breakReference(returning2, reference)) : returning2;
}
const addToBasicOperatorArray = (num, func) => {
    basicOperatorArray[num] = func;
    operatorArray[num] = async (args, scope, reference, referenceData) => {
        return basicOperatorArray[num](await run(args[0], scope, reference, referenceData), args[1], scope, reference, referenceData);
    }
}
const handleArray = async (arr, references, referenceData) => {
    const type = values.type(arr);
    if(type == values.types.ARRAY_REFERENCE || type == values.types.FUNCTION_REFERENCE) {
        return await data.getReference(references, arr.val);
    }
    if(type == values.types.ARRAY || type == values.types.FUNCTION) {
        const ref = await data.createReference(references, arr.val);
        ref.markModified("val");
        const previousValue = arr.val;
        arr.val = ref._id;
        if(type == values.types.ARRAY) {
            arr.type = values.types.ARRAY_REFERENCE;
            for(const item in previousValue) {
                const refNo = await handleArray(previousValue[item], references, referenceData);
                if(refNo == null) {
                    continue;
                }
                createOrAddOne(ref.uses, refNo._id);
                refNo.usedBy++;
            }
        } else {
            arr.type = values.types.FUNCTION_REFERENCE;
        }
        return ref;
    }
    return null;
}
const assign = async (first, res, scope, reference, referenceData, givenScope = null) => {
    const type = values.type(first);
    if(type != values.types.VARIABLE && type != values.types.ARRAY_ACCESS) {
        throw "Expecting a variable or property on the left side of an assignment expression!";
    }
    let previousContainer = null;
    let usesHolder = null;
    let val = null;
    let isMap = false;
    if(type == values.types.VARIABLE) {
        let con = givenScope;
        if(!con) {
            con = first.scope;
        }
        if(!con) {
            con = scope.getContaining(first.val);
        }
        if(!con) {
            con = scope;
        }
        previousContainer = con.variables;
        isMap = con.special;
        usesHolder = con.special ? referenceData : null;
        val = first.val;
    } else {
        if(first.arr.type == values.types.ARRAY_REFERENCE) {
            const ref = await data.getReference(reference, first.arr.val);
            ref.markModified('val');
            previousContainer = ref.val;
            usesHolder = ref.uses;
        } else {
            previousContainer = first.arr.val;
        }
        val = first.num;
    }
    const previousValue = isMap ? previousContainer.get(val) : previousContainer[val];
    if(previousValue !== undefined) {
        if(usesHolder !== null) {
            const pType = values.type(previousValue);
            if(pType == values.types.ARRAY_REFERENCE || pType == values.types.FUNCTION_REFERENCE) {
                deleteOrSubtractOne(usesHolder, previousValue.val);
                const ref = await data.getReference(reference, previousValue.val);
                ref.usedBy--;
            }
        }
    }
    isMap ? previousContainer.set(val, res) : (previousContainer[val] = res);
    if(usesHolder !== null) {
        const ref = await handleArray(res, reference, referenceData);
        const rType = values.type(res);
        if(rType == values.types.ARRAY_REFERENCE || rType == values.types.FUNCTION_REFERENCE) {
            createOrAddOne(usesHolder, res.val);
            ref.usedBy++;
        }
    }
    return first;
}
operatorArray[operatorTypes.ARRAY] = async (args, scope, reference, referenceData) => {
    const returning = {};
    let i = 0;
    for(const arg of args) {
        returning[i] = await run(arg, scope, reference, referenceData);
        i++;
    }
    return new values.Value(values.types.ARRAY, returning);
}
operatorArray[operatorTypes.SCOPE] = async (args, scope, reference, referenceData) => {
    for(let i = 0; i < args.length - 1; i++) {
        await run(args[i], scope, reference, referenceData);
    }
    return args.length == 0 ? null : await run(args[args.length - 1], scope, reference, referenceData);
}
addToBasicOperatorArray(operatorTypes.ADD, async (a, _b, scope, reference, referenceData) => {
    const b = await run(_b, scope, reference, referenceData);
    const aType = values.type(a);
    if(aType == values.types.STRING) {
        return a + await values.getString(b, scope, reference);
    }
    return values.getNumber(a, aType) + values.getNumber(b);
});
addToBasicOperatorArray(operatorTypes.SUBTRACT, async (a, _b, scope, reference, referenceData) => {
    const b = await run(_b, scope, reference, referenceData);
    const aType = values.type(a);
    if(aType == values.types.STRING) {
        return a.substring(0, a.length - values.getNumber(b));
    }
    return values.getNumber(a, aType) - values.getNumber(b);
});
addToBasicOperatorArray(operatorTypes.MULTIPLY, async (a, _b, scope, reference, referenceData) => {
    const b = await run(_b, scope, reference, referenceData);
    const aType = values.type(a);
    const bType = values.type(b);
    if(aType == values.types.STRING) {
        return a.repeat(values.getNumber(b, bType));
    }
    if(bType == values.types.STRING) {
        return b.repeat(values.getNumber(a, aType));
    }
    return values.getNumber(a, aType) * values.getNumber(b, bType);
});
addToBasicOperatorArray(operatorTypes.DIVIDE, async (a, _b, scope, reference, referenceData) => {
    const b = await run(_b, scope, reference, referenceData);
    return values.getNumber(a) / values.getNumber(b);
});
addToBasicOperatorArray(operatorTypes.MODULO, async (a, _b, scope, reference, referenceData) => {
    const b = await run(_b, scope, reference, referenceData);
    return values.getNumber(a) % values.getNumber(b);
});
addToBasicOperatorArray(operatorTypes.EXPONENT, async (a, _b, scope, reference, referenceData) => {
    const b = await run(_b, scope, reference, referenceData);
    return values.getNumber(a) ** values.getNumber(b);
});
operatorArray[operatorTypes.VALUE] = args => {
    return args;
}
operatorArray[operatorTypes.REFERENCE] = (args, scope) => {
    return { type: values.types.VARIABLE, val: args, scope: scope };
}
operatorArray[operatorTypes.SCOPEDREFERENCE] = async (args, _, reference, referenceData) => {
    return await run(args[2], await args[0][args[1]](), reference, referenceData);
}
operatorArray[operatorTypes.ASSIGNMENT] = async (args, scope, reference, referenceData) => {
    const first = await run(args[0], scope, reference, referenceData, false, false, false);
    const second = await run(args[1], scope, reference, referenceData, true, false);
    return await assign(first, second, scope, reference, referenceData);
}
const breakVarWithScope = async (first, scope, reference) => {
    let value = first;
    let givenScope = null;
    if(values.type(first) == values.types.VARIABLE) { // basically break variable manually
        givenScope = first.scope;
        if(!givenScope) {
            givenScope = scope.getContaining(first.val);
        }
        if(!givenScope) {
            throw `The variable ${first.val} does not exist!`;
        }
        value = givenScope.__get(first.val);
    }
    value = await values.breakReference(await values.breakAccess(value, reference), reference);
    return [value, givenScope];
}
operatorArray[operatorTypes.OPERATEASSIGN] = async (args, scope, reference, referenceData) => {
    const first = await run(args[0], scope, reference, referenceData, false, false, false);
    let value, givenScope = await breakVarWithScope(first, scope, reference);
    value = basicOperatorArray[args[1]](value, args[2], scope, reference);
    return await assign(first, value, scope, reference, referenceData, givenScope);
}
operatorArray[operatorTypes.POSTADD] = async (args, scope, reference, referenceData) => {
    const first = await run(args, scope, reference, referenceData, false, false, false);
    let [value, givenScope] = await breakVarWithScope(first, scope, reference);
    const oldNumber = values.getNumber(value);
    return await assign(first, oldNumber + 1, scope, reference, referenceData, givenScope);
}
operatorArray[operatorTypes.POSTSUBTRACT] = async (args, scope, reference, referenceData) => {
    const first = await run(args, scope, reference, referenceData, false, false, false);
    let [value, givenScope] = await breakVarWithScope(first, scope, reference);
    const oldNumber = values.getNumber(value);
    return await assign(first, oldNumber - 1, scope, reference, referenceData, givenScope);
}
operatorArray[operatorTypes.DELETE] = async (args, scope, reference, referenceData) => {
    const container = scope.getContaining(args);
    if(container === null) {
        throw `Variable ${args} could not be deleted because it does not exist!`;
    }
    const removed = container.__get(args);
    const rType = values.type(removed);
    if(container.special && (rType == values.types.ARRAY_REFERENCE || rType == values.types.FUNCTION_REFERENCE)) {
        deleteOrSubtractOne(referenceData, removed.val);
        const ref = await data.getReference(reference, removed.val);
        ref.usedBy--;
    }
    container.special ? container.variables.delete(args) : (delete container.variables[args]);
    return removed;
}
operatorArray[operatorTypes.MAKE] = (args, scope) => {
    scope.set(args, null);
    return new values.Value(values.types.VARIABLE, args);
}
operatorArray[operatorTypes.ACCESS] = async (args, scope, reference, referenceData) => {
    const first = await run(args[0], scope, reference, referenceData, true, false);
    const second = await run(args[1], scope, reference, referenceData);
    const fType = values.type(first);
    if(fType != values.types.ARRAY && fType != values.types.ARRAY_REFERENCE) {
        throw `Expecting an object to access property via brackets!`;
    }
    const secondNum = await values.getString(second);
    return { type: values.types.ARRAY_ACCESS, arr: first, num: secondNum };
}
operatorArray[operatorTypes.DOTACCESS] = async (args, scope, reference, referenceData) => {
    const first = await run(args[0], scope, reference, referenceData, true, false);
    const fType = values.type(first);
    if(fType != values.types.ARRAY && fType != values.types.ARRAY_REFERENCE) {
        throw `Expecting an object to access property via dotting!`;
    }
    return { type: values.types.ARRAY_ACCESS, arr: first, num: args[1] };
}
operatorArray[operatorTypes.OBJECT] = async (args, scope, reference, referenceData) => {
    const obj = new values.Value(values.types.ARRAY, {});
    const _scope = new Scope(scope, obj.val, false);
    await run(args, _scope, reference, referenceData);
    return obj;
}
operatorArray[operatorTypes.WHILE] = async (args, scope, reference, referenceData) => {
    const returning = {};
    let i = 0;
    while(values.getBoolean(await run(args[0], scope, reference, referenceData))) {
        returning[i] = await run(args[1], new Scope(scope), reference, referenceData);
        i++;
    }
    return new values.Value(values.types.ARRAY, returning);
}
addToBasicOperatorArray(operatorTypes.EQUALS, async (a, _b, scope, reference, referenceData) => {
    const b = await run(_b, scope, reference, referenceData);
    return values.equals(a, b);
});
addToBasicOperatorArray(operatorTypes.NOTEQUALS, async (a, _b, scope, reference, referenceData) => {
    const b = await run(_b, scope, reference, referenceData);
    return !values.equals(a, b);
});
addToBasicOperatorArray(operatorTypes.LESSTHAN, async (a, _b, scope, reference, referenceData) => {
    const b = await run(_b, scope, reference, referenceData);
    return values.getNumber(a) < values.getNumber(b);
});
addToBasicOperatorArray(operatorTypes.GREATERTHAN, async (a, _b, scope, reference, referenceData) => {
    const b = await run(_b, scope, reference, referenceData);
    return values.getNumber(a) > values.getNumber(b);
});
addToBasicOperatorArray(operatorTypes.LESSTHANOREQUALS, async (a, _b, scope, reference, referenceData) => {
    const b = await run(_b, scope, reference, referenceData);
    return values.getNumber(a) <= values.getNumber(b);
});
addToBasicOperatorArray(operatorTypes.GREATERTHANOREQUALS, async (a, _b, scope, reference, referenceData) => {
    const b = await run(_b, scope, reference, referenceData);
    return values.getNumber(a) >= values.getNumber(b);
});
addToBasicOperatorArray(operatorTypes.AND, async (a, _b, scope, reference, referenceData) => {
    if(!values.getBoolean(a)) {
        return a;
    }
    return await run(_b, scope, reference, referenceData);
});
addToBasicOperatorArray(operatorTypes.OR, async (a, _b, scope, reference, referenceData) => {
    if(values.getBoolean(a)) {
        return a;
    }
    return await run(_b, scope, reference, referenceData);
});
operatorArray[operatorTypes.IF] = async (args, scope, reference, referenceData) => {
    if(values.getBoolean(await run(args[0], scope, reference, referenceData))) {
        return await run(args[1], new Scope(scope), reference, referenceData);
    }
    if(args.length > 2) {
        return await run(args[2], scope, reference, referenceData);
    }
    return null;
}
operatorArray[operatorTypes.FOR] = async (args, scope, reference, referenceData) => {
    const outerScope = new Scope(scope);
    const returning = {};
    let i = 0;
    if(args[0].length > 0) {
        await run(args[0][0], outerScope, reference, referenceData);
    }
    if(args[0].length > 1) {
        while(values.getBoolean(await run(args[0][1], outerScope, reference, referenceData))) {
            const innerScope = new Scope(outerScope);
            returning[i] = await run(args[1], innerScope, reference, referenceData);
            i++;
            if(args[0].length > 2) {
                await run(args[0][2], outerScope, reference, referenceData);
            }
        }
    }
    return new values.Value(values.types.ARRAY, returning);
}
operatorArray[operatorTypes.NOT] = async (args, scope, reference, referenceData) => {
    const a = await run(args, scope, reference, referenceData);
    return !values.getBoolean(a);
}
operatorArray[operatorTypes.NEGATIVE] = async (args, scope, reference, referenceData) => {
    const a = await run(args, scope, reference, referenceData);
    return -values.getNumber(a);
}
operatorArray[operatorTypes.FUNCTION] = args => {
    return { type: values.types.FUNCTION, args: args[0], body: args[1] };
}
operatorArray[operatorTypes.FUNCTIONCALL] = async (args, scope, reference, referenceData) => {
    const fun = await run(args[0], scope, reference, referenceData, false, false, false);
    let [value, givenScope] = await breakVarWithScope(fun, scope, reference);
    if(givenScope === null) {
        givenScope = scope;
    }
    const _scope = new Scope(givenScope);
    if(values.type(value) != values.types.FUNCTION) {
        throw `Expecting a function!`;
    }
    if(args[1].length < value.args.length) {
        throw `The given function requires ${value.args.length} arguments, but only ${args[1].length} were provided!`;
    }
    for(let i = 0; i < value.args.length; i++) {
        _scope.variables[value.args[i]] = await run(args[1][i], scope, reference, referenceData);
    }
    return await run(value.body, _scope, reference, referenceData);
}
operatorArray[operatorTypes.PRINT] = async (args, scope, reference, referenceData) => {
    const value = await run(args[1], scope, reference, referenceData);
    args[0](await values.getString(value, scope, reference)); // add to output
    return value;
}
module.exports = { Operator, operatorArray, operatorTypes };