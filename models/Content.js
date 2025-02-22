const mongoose = require('mongoose');
var schema = require("./conversationSchema")
module.exports = mongoose.model('conversation', schema);;