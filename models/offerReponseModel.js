const mongoose = require('mongoose');
var schema = require("./offerResponseSchema")
module.exports = mongoose.model('offerresponse', schema);;