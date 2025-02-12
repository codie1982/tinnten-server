const mongoose = require('mongoose');
var schema = require("./contentSchema")
module.exports = mongoose.model('content', schema);;