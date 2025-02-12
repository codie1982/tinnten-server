const mongoose = require('mongoose');
var schema = require("./socialLinksSchema")
module.exports = mongoose.model('sociallinks', schema);;