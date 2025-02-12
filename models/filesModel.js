const mongoose = require('mongoose');
var schema = require("./filesSchema")
module.exports = mongoose.model('files', schema);;