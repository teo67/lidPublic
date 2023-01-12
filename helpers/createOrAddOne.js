module.exports = (obj, prop) => {
    const res = obj.get(prop);
    if(res === undefined) {
        //console.log(prop);
        obj.set(prop, 1);
    } else {
        obj.set(prop, res + 1);
    }
    console.log(obj);
}