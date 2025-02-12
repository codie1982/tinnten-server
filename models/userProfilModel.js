const mongoose = require('mongoose');
var schema = require("./schema/userProfilSchema")
module.exports = mongoose.model('userprofil', schema);;