const mongoose = require('mongoose');
var schema = require("./dynamicFormSchema")
module.exports = mongoose.model('dynamicform', schema);;