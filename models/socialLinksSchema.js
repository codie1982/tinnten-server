const mongoose = require("mongoose");

const socialSchema = new mongoose.Schema({
  userid: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
  link: { type: String },
}, { timestamps: true });

module.exports = socialSchema;