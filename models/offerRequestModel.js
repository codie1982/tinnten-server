const mongoose = require('mongoose');
var schema = require("./schema/offerRequestSchem")
module.exports = mongoose.model('offerrequest', schema);;