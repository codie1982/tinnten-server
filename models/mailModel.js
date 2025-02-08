const mongoose = require('mongoose');
var schema = require("./schema/mailSchema")
module.exports = mongoose.model('mail', schema);;