const mongoose = require("mongoose");


const gallerySchema = new mongoose.Schema({
  title: { type: String, required: true },
  images: [{ type: mongoose.Schema.Types.ObjectId, ref: "images" }],
  description: { type: String, default: "" },
}, { timestamps: true });

module.exports = gallerySchema;