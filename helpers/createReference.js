module.exports = (references, referenceData, newref) => {
    const newr = {
        num: 0, 
        val: newref
    };
    if(referenceData.stack.length == 0) {
        references[referenceData.next] = newr;
        return referenceData.next++;
    }
    const last = referenceData.stack.pop();
    references[last] = newr;
    return last;
}