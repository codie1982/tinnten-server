const mongoose = require('mongoose');
var schema = require("./schema/userSchema")
module.exports = mongoose.model('users', schema);;