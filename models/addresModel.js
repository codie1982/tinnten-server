const mongoose = require('mongoose');
var schema = require("./addresSchema")
module.exports = mongoose.model('addresses', schema);;