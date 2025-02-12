const mongoose = require('mongoose');
var schema = require("./documentSchema")
module.exports = mongoose.model('document', schema);;