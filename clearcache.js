require('dotenv').config();
const data = require('./helpers/data.js');
const Reference = require('./models/reference.js');
const scope = require('./models/scope.js');
data.clearMongo(Reference);
data.clearMongo(scope.Private);
data.clearMongo(scope.Public);
data.clearMongo(scope.Global);