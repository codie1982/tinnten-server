const mongoose = require('mongoose');
var schema = require("./schema/bidlocationSchema")
module.exports = mongoose.model('bidlocation', schema);;