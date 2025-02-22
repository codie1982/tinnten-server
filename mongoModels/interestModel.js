const mongoose = require('mongoose');
var schema = require("./interestSchema")
module.exports = mongoose.model('interest', schema);;