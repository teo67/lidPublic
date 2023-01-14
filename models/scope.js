const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const scope = {
    _id: {
        type: String, 
        required: true
    },
    variables: {
        type: Map,
        required: true,
        default: {},
        of: mongoose.SchemaTypes.Mixed
    }
};

const private = new Schema(scope, {
    collection: 'private'
});

const public = new Schema(scope, {
    collection: 'public'
});

const global = new Schema({
    _id: {
        type: Boolean, 
        required: true, 
        default: true
    }, 
    variables: {
        type: Map,
        required: true,
        default: {},
        of: mongoose.SchemaTypes.Mixed
    },
    uses: {
        type: Map,
        required: true,
        default: {},
        of: Number
    }
}, {
    collection: 'global'
});

const Private = mongoose.model('private', private);
const Public = mongoose.model('public', public);
const Global = mongoose.model('global', global);
module.exports = { Private, Public, Global };