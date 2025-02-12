const mongoose = require('mongoose');
var schema = require("./schema/dynamicFormSchema")
module.exports = mongoose.model('dynamicform', schema);;