const mongoose = require('mongoose');
var schema = require("./productsSchema")
module.exports = mongoose.model('products', schema);;