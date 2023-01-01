module.exports = (references, referenceData, i) => {
    delete references[i];
    referenceData.stack.push(parseInt(i));
}