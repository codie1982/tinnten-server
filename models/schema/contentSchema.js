const mongoose = require("mongoose");


const contentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  tags: [{ type: String }],
}, { timestamps: true });

module.exports = contentSchema;