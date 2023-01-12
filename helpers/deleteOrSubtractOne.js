module.exports = (obj, prop) => {
    const res = obj.get(prop);
    obj.set(prop, res - 1);
    if(res == 1) {
        obj.delete(prop);
    }
}