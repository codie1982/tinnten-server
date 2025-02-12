const mongoose = require("mongoose");
const uploadSchema = require("./uploadSchema")
module.exports = mongoose.model("uploads", uploadSchema);