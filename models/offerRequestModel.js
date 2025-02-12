const mongoose = require('mongoose');
var schema = require("./offerRequestSchema")
module.exports = mongoose.model('offerrequest', schema);;