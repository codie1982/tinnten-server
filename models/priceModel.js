const mongoose = require('mongoose');
var schema = require("./priceSchema")
module.exports = mongoose.model('price', schema);;