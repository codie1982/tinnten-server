const mongoose = require('mongoose');
var schema = require("./schema/formFieldSchema")
module.exports = mongoose.model('formfield', schema);;