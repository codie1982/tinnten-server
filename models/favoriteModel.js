const mongoose = require('mongoose');
var schema = require("./schema/favoriteSchema")
module.exports = mongoose.model('favorite', schema);;