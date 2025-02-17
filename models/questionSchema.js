const mongoose = require("mongoose");

// 🗣️ Mesaj Şeması (Kullanıcı ve LLM)
const questionSchema = new mongoose.Schema({
  conversationid: { type: mongoose.Schema.Types.ObjectId, ref: "conversation", required: true },
  questionText: { type: String, required: true },  // LLM'in sorduğu soru
  timestamp: { type: Date, default: Date.now },  // Soru sorulma zamanı
  expectedAnswerType: { type: String, enum: ["text", "number", "boolean"], default: "text" },  // Beklenen cevap türü
  answers: [{ type: mongoose.Schema.Types.ObjectId, ref: "answer" }]  // Kullanıcının verdiği cevaplar
}, { timestamps: true });

module.exports = questionSchema;