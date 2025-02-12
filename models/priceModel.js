const mongoose = require('mongoose');
var schema = require("./schema/priceSchema")
module.exports = mongoose.model('price', schema);;