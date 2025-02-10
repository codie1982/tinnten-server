const mongoose = require('mongoose');
var schema = require("./schema/imageSchema")
module.exports = mongoose.model('images', schema);;