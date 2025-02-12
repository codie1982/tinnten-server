const mongoose = require('mongoose');
var schema = require("./priceRangeSchema")
module.exports = mongoose.model('pricerange', schema);;