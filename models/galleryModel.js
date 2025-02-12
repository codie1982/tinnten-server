const mongoose = require('mongoose');
var schema = require("./gallerySchema")
module.exports = mongoose.model('gallery', schema);;