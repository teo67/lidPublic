const mongoose = require('mongoose');
const Schema = mongoose.Schema;



const referenceSchema = new Schema({
    // leave id as default
    usedBy: {
        type: Number, 
        required: true,
        default: 0
    },
    uses: {
        type: Map,
        required: true,
        default: {},
        of: Number
    },
    val: {
        type: mongoose.SchemaTypes.Mixed,
        required: true,
        default: null
    }
}, {
    collection: 'references'
});

const Reference = mongoose.model('reference', referenceSchema);
module.exports = Reference;