const mongoose = require('mongoose');
var schema = require("./schema/variantsSchema")
module.exports = mongoose.model('variants', schema);;