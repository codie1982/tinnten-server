const mongoose = require("mongoose");
const uploadSchema = require("./schema/uploadSchema")
module.exports = mongoose.model("uploads", uploadSchema);