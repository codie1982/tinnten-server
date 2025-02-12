const mongoose = require('mongoose');
var schema = require("./userProfilSchema")
module.exports = mongoose.model('userprofil', schema);;