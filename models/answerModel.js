const mongoose = require('mongoose');
var schema = require("./answerSchema")
module.exports = mongoose.model('answer', schema);;