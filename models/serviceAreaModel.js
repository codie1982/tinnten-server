const mongoose = require('mongoose');
var schema = require("./serviceAreaSchema")
module.exports = mongoose.model('servicesarea', schema);;