const mongoose = require('mongoose');
var schema = require("./schema/addresSchema")
module.exports = mongoose.model('addres', schema);;