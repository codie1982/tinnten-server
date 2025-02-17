const mongoose = require('mongoose');
var schema = require("./questionSchema")
module.exports = mongoose.model('question', schema);;