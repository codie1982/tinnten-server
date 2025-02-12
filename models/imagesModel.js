const mongoose = require('mongoose');
var schema = require("./imageSchema")
module.exports = mongoose.model('images', schema);;