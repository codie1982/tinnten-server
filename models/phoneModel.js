const mongoose = require('mongoose');
var schema = require("./phoneSchema")
module.exports = mongoose.model('phone', schema);;