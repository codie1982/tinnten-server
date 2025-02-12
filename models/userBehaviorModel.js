const mongoose = require('mongoose');
var schema = require("./userBehaviorSchema")
module.exports = mongoose.model('userbehavior', schema);;