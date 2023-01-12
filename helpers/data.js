const fs = require('node:fs/promises');
const URI = 'mongodb+srv://' + process.env.MONGOUSER + ':' + process.env.MONGOPASS + '@lid.fq6t1no.mongodb.net/lid?retryWrites=true&w=majority';
const mongoose = require('mongoose');
mongoose.set('strictQuery', false); // get rid of deprecation warning
const Reference = require('../models/reference');

mongoose.connect(URI, {
    useNewUrlParser: true, 
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB.');
}).catch(err => {
    console.log('Error connecting to database: ' + err);
});

const write = async (data, fileName) => {
    const asJson = JSON.stringify(data, null, 2);
    await fs.writeFile(fileName + ".json", asJson);
}

const clear = async fileName => {
    await fs.writeFile(fileName + ".json", "");
}

const read = async (filename, def) => {
    let str = (await fs.readFile(filename + ".json")).toString();
    if(str.length == 0) {
        str = def;
    }
    return JSON.parse(str);
}

const load = async (model, id) => {
    try {
        return (await model.findOne({ _id: id }));
    } catch(e) {
        console.log(`Servers faied: ${e}`);
        return Promise.reject(e);
    }
}

const clearMongo = async model => {
    await model.deleteMany({});
}

const createReference = async (references, val) => {
    const ref = new Reference({
        usedBy: 0, 
        uses: {},
        val: val
    });
    ref.markModified('val');
    try {
        await ref.save();
        references[ref.id] = ref;
        return ref;
    } catch(e) {
        throw `Error saving to database.`;
    }
}

const getReference = async (references, id) => {
    const val = references[id];
    if(val === undefined) {
        const r = await load(Reference, id);
        references[id] = r;
        return r;
    }
    return val;
}

module.exports = { write, read, clear, createReference, getReference, clearMongo };