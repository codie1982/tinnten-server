const mongoose = require('mongoose');
var schema = require("./offerCompanyMappingSchema")
module.exports = mongoose.model('offercompanymapping', schema);;