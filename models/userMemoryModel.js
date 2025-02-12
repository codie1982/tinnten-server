const mongoose = require('mongoose');
var schema = require("./userMemorySchema")
module.exports = mongoose.model('usermemory', schema);;