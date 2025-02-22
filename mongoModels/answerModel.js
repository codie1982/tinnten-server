const mongoose = require('mongoose');
// ❓ Dinamik Soru-Cevap
const questionAnswerSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, default: "" },
  relatedTo: { type: String, enum: ["product", "service"], required: true },
}, { timestamps: true });
module.exports = mongoose.model('answer', questionAnswerSchema);;