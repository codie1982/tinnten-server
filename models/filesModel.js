const mongoose = require('mongoose');
var schema = require("./schema/filesSchema")
module.exports = mongoose.model('files', schema);;