const mongoose = require('mongoose');
var schema = require("./schema/conversitionSchema")
module.exports = mongoose.model('conversition', schema);;