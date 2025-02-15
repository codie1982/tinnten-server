const mongoose = require('mongoose');
var schema = require("./phoneSchema")
module.exports = mongoose.model('phones', schema);;