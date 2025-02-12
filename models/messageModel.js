const mongoose = require('mongoose');
var schema = require("./messageSchema")
module.exports = mongoose.model('message', schema);;