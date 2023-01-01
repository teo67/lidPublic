module.exports = (obj, prop) => {
    if(obj[prop] === undefined) {
        obj[prop] = 1;
    } else {
        obj[prop]++;
    }
}