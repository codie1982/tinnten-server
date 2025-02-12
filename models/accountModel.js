const mongoose = require("mongoose");
const accountSchema = require("./schema/accountSchema");
module.exports = mongoose.model("accounts", accountSchema);