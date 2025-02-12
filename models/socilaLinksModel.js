const mongoose = require('mongoose');
var schema = require("./schema/socialSchema")
module.exports = mongoose.model('social', schema);;