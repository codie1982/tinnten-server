const mongoose = require('mongoose');
var schema = require("./systemPackageSchema")
module.exports = mongoose.model('system-packages', schema);;