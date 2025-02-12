const mongoose = require('mongoose');
var schema = require("./schema/phoneSchema")
module.exports = mongoose.model('phone', schema);;