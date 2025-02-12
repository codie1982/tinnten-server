const mongoose = require('mongoose');
var schema = require("./schema/offerCompanyRelationSchema")
module.exports = mongoose.model('offercompanyreletation', schema);;