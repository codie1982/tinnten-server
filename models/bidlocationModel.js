const mongoose = require('mongoose');
var schema = require("./bidlocationSchema")
module.exports = mongoose.model('bidlocation', schema);;