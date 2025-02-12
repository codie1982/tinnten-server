const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
  subid: { type: String },
}, { timestamps: true });

module.exports = userSchema;