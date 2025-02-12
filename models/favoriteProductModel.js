const mongoose = require('mongoose');
var schema = require("./favoriteProductSchema")
module.exports = mongoose.model('favoriteproduct', schema);;