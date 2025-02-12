const mongoose = require('mongoose');
var schema = require("./schema/servicesSchema")
module.exports = mongoose.model('services', schema);;