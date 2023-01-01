module.exports = (obj, prop) => {
    if(--obj[prop] == 0) {
        delete obj[prop];
    }
}