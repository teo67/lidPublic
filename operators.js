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
    if(arr.type == values.types.ARRAY_REFERENCE || arr.type == values.types.FUNCTION_REFERENCE) {
        return await data.getReference(references, arr.val);
    }
    if(arr.type == values.types.ARRAY || arr.type == values.types.FUNCTION) {
        const ref = await data.createReference(references, arr.val);
        ref.markModified("val");
        const previousValue = arr.val;
        arr.val = ref._id;
        if(arr.type == values.types.ARRAY) {
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
        usesHolder = con.special ? referenceData : null;
        val = first.val;
    } else {
        if(first.val.arr.type == values.types.ARRAY_REFERENCE) {
            const ref = await data.getReference(reference, first.val.arr.val);
            ref.markModified('val');
            ref.markModified('uses'); // !!!???
            previousContainer = ref.val;
            usesHolder = ref.uses;
        } else {
            previousContainer = first.val.arr.val;
        }
        val = first.val.num;
    }
    console.log(previousContainer);
    console.log(val);
    const previousValue = previousContainer[val];
    if(previousValue !== undefined) {
        if(usesHolder !== null) {
            if(previousValue.type == values.types.ARRAY_REFERENCE || previousValue.type == values.types.FUNCTION_REFERENCE) {
                deleteOrSubtractOne(usesHolder, previousValue.val);
                console.log("deleting");
                const ref = await data.getReference(reference, previousValue.val);
                ref.usedBy--;
            }
        }
    }
    previousContainer[val] = res;
    if(usesHolder !== null) {
        const ref = await handleArray(res, reference, referenceData);
        if(res.type == values.types.ARRAY_REFERENCE || res.type == values.types.FUNCTION_REFERENCE) {
            createOrAddOne(usesHolder, res.val);
            // console.log(usesHolder);
            // console.log((await data.getReference(reference, first.val.arr.val)).uses);
            // console.log("from references:");
            // console.log(reference[first.val.arr.val]);
            // console.log(first.val.arr.val)
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
    return args.length == 0 ? new values.Value(values.types.NONE, null) : await run(args[args.length - 1], scope, reference, referenceData);
}
addToBasicOperatorArray(operatorTypes.ADD, async (a, _b, scope, reference, referenceData) => {
    const b = await run(_b, scope, reference, referenceData);
    if(a.type == values.types.STRING) {
        return new values.Value(values.types.STRING, await values.getString(a, scope, reference) + await values.getString(b, scope, reference));
    }
    return new values.Value(values.types.NUMBER, values.getNumber(a) + values.getNumber(b));
});
addToBasicOperatorArray(operatorTypes.SUBTRACT, async (a, _b, scope, reference, referenceData) => {
    const b = await run(_b, scope, reference, referenceData);
    if(a.type == values.types.STRING) {
        const str = await values.getString(a, scope, reference);
        return new values.Value(values.types.STRING, str.substring(0, str.length - values.getNumber(b)));
    }
    return new values.Value(values.types.NUMBER, values.getNumber(a) - values.getNumber(b));
});
addToBasicOperatorArray(operatorTypes.MULTIPLY, async (a, _b, scope, reference, referenceData) => {
    const b = await run(_b, scope, reference, referenceData);
    if(a.type == values.types.STRING) {
        return new values.Value(values.types.STRING, (await values.getString(a, scope, reference)).repeat(values.getNumber(b)));
    }
    if(b.type == values.types.STRING) {
        return new values.Value(values.types.STRING, (await values.getString(b, scope, reference)).repeat(values.getNumber(a)));
    }
    return new values.Value(values.types.NUMBER, values.getNumber(a) * values.getNumber(b));
});
addToBasicOperatorArray(operatorTypes.DIVIDE, async (a, _b, scope, reference, referenceData) => {
    const b = await run(_b, scope, reference, referenceData);
    return new values.Value(values.types.NUMBER, values.getNumber(a) / values.getNumber(b));
});
addToBasicOperatorArray(operatorTypes.MODULO, async (a, _b, scope, reference, referenceData) => {
    const b = await run(_b, scope, reference, referenceData);
    return new values.Value(values.types.NUMBER, values.getNumber(a) % values.getNumber(b));
});
addToBasicOperatorArray(operatorTypes.EXPONENT, async (a, _b, scope, reference, referenceData) => {
    const b = await run(_b, scope, reference, referenceData);
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
operatorArray[operatorTypes.ASSIGNMENT] = async (args, scope, reference, referenceData) => {
    const first = await run(args[0], scope, reference, referenceData, false, false, false);
    const second = await run(args[1], scope, reference, referenceData, true, false);
    return await assign(first, second, scope, reference, referenceData);
}
const breakVarWithScope = async (first, scope, reference) => {
    let value = first;
    let givenScope = null;
    if(first.type == values.types.VARIABLE) { // basically break variable manually
        givenScope = scope.getContaining(first.val);
        if(givenScope === null) {
            throw `The variable ${first.val} does not exist!`;
        }
        value = givenScope.variables[first.val];
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
    value = new values.Value(values.types.NUMBER, oldNumber + 1);
    return await assign(first, value, scope, reference, referenceData, givenScope);
}
operatorArray[operatorTypes.POSTSUBTRACT] = async (args, scope, reference, referenceData) => {
    const first = await run(args, scope, reference, referenceData, false, false, false);
    let [value, givenScope] = await breakVarWithScope(first, scope, reference);
    const oldNumber = values.getNumber(value);
    value = new values.Value(values.types.NUMBER, oldNumber - 1);
    return await assign(first, value, scope, reference, referenceData, givenScope);
}
operatorArray[operatorTypes.DELETE] = async (args, scope, reference, referenceData) => {
    const container = scope.getContaining(args);
    if(container === null) {
        throw `Variable ${args} could not be deleted because it does not exist!`;
    }
    const removed = container.variables[args];
    if(container.special && (removed.type == values.types.ARRAY_REFERENCE || removed.type == values.types.FUNCTION_REFERENCE)) {
        deleteOrSubtractOne(referenceData, removed.val);
        const ref = await data.getReference(reference, removed.val);
        ref.usedBy--;
    }
    delete container.variables[args];
    return removed;
}
operatorArray[operatorTypes.MAKE] = (args, scope) => {
    scope.set(args, new values.Value(values.types.NONE, null));
    return new values.Value(values.types.VARIABLE, args);
}
operatorArray[operatorTypes.ACCESS] = async (args, scope, reference, referenceData) => {
    const first = await run(args[0], scope, reference, referenceData, true, false);
    const second = await run(args[1], scope, reference, referenceData);
    if(first.type != values.types.ARRAY && first.type != values.types.ARRAY_REFERENCE) {
        throw `Expecting an object to access property via brackets!`;
    }
    const secondNum = await values.getString(second);
    return new values.Value(values.types.ARRAY_ACCESS, { arr: first, num: secondNum });
}
operatorArray[operatorTypes.DOTACCESS] = async (args, scope, reference, referenceData) => {
    const first = await run(args[0], scope, reference, referenceData, true, false);
    if(first.type != values.types.ARRAY && first.type != values.types.ARRAY_REFERENCE) {
        throw `Expecting an object to access property via dotting!`;
    }
    return new values.Value(values.types.ARRAY_ACCESS, { arr: first, num: args[1] });
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
    return new values.Value(values.types.BOOLEAN, values.equals(a, b));
});
addToBasicOperatorArray(operatorTypes.NOTEQUALS, async (a, _b, scope, reference, referenceData) => {
    const b = await run(_b, scope, reference, referenceData);
    return new values.Value(values.types.BOOLEAN, !values.equals(a, b));
});
addToBasicOperatorArray(operatorTypes.LESSTHAN, async (a, _b, scope, reference, referenceData) => {
    const b = await run(_b, scope, reference, referenceData);
    return new values.Value(values.types.BOOLEAN, values.getNumber(a) < values.getNumber(b));
});
addToBasicOperatorArray(operatorTypes.GREATERTHAN, async (a, _b, scope, reference, referenceData) => {
    const b = await run(_b, scope, reference, referenceData);
    return new values.Value(values.types.BOOLEAN, values.getNumber(a) > values.getNumber(b));
});
addToBasicOperatorArray(operatorTypes.LESSTHANOREQUALS, async (a, _b, scope, reference, referenceData) => {
    const b = await run(_b, scope, reference, referenceData);
    return new values.Value(values.types.BOOLEAN, values.getNumber(a) <= values.getNumber(b));
});
addToBasicOperatorArray(operatorTypes.GREATERTHANOREQUALS, async (a, _b, scope, reference, referenceData) => {
    const b = await run(_b, scope, reference, referenceData);
    return new values.Value(values.types.BOOLEAN, values.getNumber(a) >= values.getNumber(b));
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
    return new values.Value(values.types.NONE, null);
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
    return new values.Value(values.types.BOOLEAN, !values.getBoolean(a));
}
operatorArray[operatorTypes.NEGATIVE] = async (args, scope, reference, referenceData) => {
    const a = await run(args, scope, reference, referenceData);
    return new values.Value(values.types.NUMBER, -values.getNumber(a));
}
operatorArray[operatorTypes.FUNCTION] = args => {
    return new values.Value(values.types.FUNCTION, { args: args[0], body: args[1] });
}
operatorArray[operatorTypes.FUNCTIONCALL] = async (args, scope, reference, referenceData) => {
    const fun = await run(args[0], scope, reference, referenceData, false, false, false);
    let [value, givenScope] = await breakVarWithScope(fun, scope, reference);
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
        _scope.variables[value.val.args[i]] = await run(args[1][i], scope, reference, referenceData);
    }
    return await run(value.val.body, _scope, reference, referenceData);
}
module.exports = { Operator, operatorArray, operatorTypes };