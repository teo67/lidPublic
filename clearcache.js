require('dotenv').config();
const data = require('./helpers/data.js');
const Reference = require('./models/reference.js');
data.clearMongo(Reference);
data.clear("./cache/referenceData");
data.clear("./cache/variables");