const mongoose = require('mongoose');
var schema = require("./packageSchema")
module.exports = mongoose.model('package', schema);;