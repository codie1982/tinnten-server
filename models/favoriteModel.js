const mongoose = require('mongoose');
var schema = require("./favoriteSchema")
module.exports = mongoose.model('favorite', schema);;