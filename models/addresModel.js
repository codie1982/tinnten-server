const mongoose = require('mongoose');
var schema = require("./addresSchema")
module.exports = mongoose.model('addres', schema);;