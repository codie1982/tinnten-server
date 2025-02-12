const mongoose = require('mongoose');
var schema = require("./questionAnswerSchema")
module.exports = mongoose.model('questionanswer', schema);;