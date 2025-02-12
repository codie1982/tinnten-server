const mongoose = require('mongoose');
var schema = require("./schema/offerRequestSchema")
module.exports = mongoose.model('offerrequest', schema);;