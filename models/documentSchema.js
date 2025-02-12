const mongoose = require("mongoose");


const documentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  file: { type: mongoose.Schema.Types.ObjectId, ref: "files", required: true },
  description: { type: String, default: "" },
  tags: [{ type: String }],
}, { timestamps: true });

module.exports = documentSchema;