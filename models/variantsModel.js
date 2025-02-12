const mongoose = require('mongoose');
var schema = require("./variantsSchema")
module.exports = mongoose.model('variants', schema);;