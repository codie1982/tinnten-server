const mongoose = require('mongoose');
var schema = require("./schema/contentSchema")
module.exports = mongoose.model('companyprofil', schema);;