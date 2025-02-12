const mongoose = require('mongoose');
var schema = require("./schema/productsSchema")
module.exports = mongoose.model('products', schema);;