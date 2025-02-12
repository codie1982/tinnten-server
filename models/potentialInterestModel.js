const mongoose = require('mongoose');
var schema = require("./potentialInterestSchema")
module.exports = mongoose.model('potentialinterest', schema);;