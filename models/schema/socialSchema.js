const mongoose = require("mongoose");

const socialSchema = new mongoose.Schema({
  userid: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
  facebook: { type: String },
  twitter: { type: String },
  instagram: { type: String }
}, { timestamps: true });

module.exports = socialSchema;