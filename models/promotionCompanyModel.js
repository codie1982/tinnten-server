const mongoose = require('mongoose');
var schema = require("./promotionCompanySchema")
module.exports = mongoose.model('promotioncompany', schema);;