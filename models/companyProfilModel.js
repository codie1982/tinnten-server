const mongoose = require('mongoose');
var schema = require("./schema/companyProfilSchema")
module.exports = mongoose.model('companyprofil', schema);;