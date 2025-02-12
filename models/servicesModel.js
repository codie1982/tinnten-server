const mongoose = require('mongoose');
var schema = require("./servicesSchema")
module.exports = mongoose.model('services', schema);;