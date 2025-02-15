const mongoose = require('mongoose');
var schema = require("./userProfilSchema")
module.exports = mongoose.model('userprofile', schema);