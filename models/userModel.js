const mongoose = require('mongoose');
var schema = require("./userSchema")
module.exports = mongoose.model('users', schema);;