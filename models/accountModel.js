const mongoose = require("mongoose");
const accountSchema = require("./accountSchema");
module.exports = mongoose.model("accounts", accountSchema);