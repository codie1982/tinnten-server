const mongoose = require('mongoose');
var schema = require("./imagesSchema")
module.exports = mongoose.model('images', schema);;