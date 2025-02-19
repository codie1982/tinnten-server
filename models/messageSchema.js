const mongoose = require("mongoose");

// 🗣️ Mesaj Şeması (Kullanıcı ve LLM)
const messageSchema = new mongoose.Schema({
  type: { type: String, enum: ["human_message", "system_message"], required: true }, // Mesaj türü
  groupid: { type: String, required: true },
  content: { type: String, required: true },  // Mesaj içeriği
  intent: { type: String, default: "" }, // LLM niyet analizi
  entities: [{ type: String }], // Örneğin: Ürün ismi, hizmet ismi
  includeInContext: { type: Boolean, default: true }, // Bağlama dahil edilsin mi?
  productionQuestions: [{ type: mongoose.Schema.Types.ObjectId, ref: "question" }], // LLM'in sorduğu sorunun ID'si
  servicesQuestions: [{ type: mongoose.Schema.Types.ObjectId, ref: "question" }], // LLM'in sorduğu sorunun ID'si
  search_context: [{ type: String }], // arama terimleri
  // 🔹 "System Message" için özel alanlar
  systemData: {
    recommendations: [{ type: mongoose.Schema.Types.ObjectId, ref: "recommendation" }] // Öneriler

  }
}, { timestamps: true });

module.exports = messageSchema;