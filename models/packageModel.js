const mongoose = require('mongoose');
var schema = require("./schema/packageSchema")
module.exports = mongoose.model('package', schema);;