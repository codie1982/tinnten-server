const mongoose = require('mongoose');
var schema = require("./recommendationSchema")
module.exports = mongoose.model('recommendation', schema);;