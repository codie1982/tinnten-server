const mongoose = require('mongoose');
var schema = require("./companyProfilSchema")
module.exports = mongoose.model('companyprofil', schema);;