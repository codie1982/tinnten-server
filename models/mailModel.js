const mongoose = require('mongoose');
var schema = require("./mailSchema")
module.exports = mongoose.model('mail', schema);;