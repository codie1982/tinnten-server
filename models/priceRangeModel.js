const mongoose = require('mongoose');
var schema = require("./schema/priceRangeSchema")
module.exports = mongoose.model('pricerange', schema);;