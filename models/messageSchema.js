const mongoose = require("mongoose");

// 🗣️ Mesaj Şeması (Kullanıcı ve LLM)
const messageSchema = new mongoose.Schema({
  type: { type: String, enum: ["human_message", "system_message"], required: true }, // Mesaj türü
  groupid: { type: String, required: true },
  content: { type: String, required: true },  // Mesaj içeriği
  timestamp: { type: Date, default: Date.now }, // Mesaj zamanı
  intent: { type: String, default: "" }, // LLM niyet analizi
  entities: [{ type: String }], // Örneğin: Ürün ismi, hizmet ismi
  includeInContext: { type: Boolean, default: true }, // Bağlama dahil edilsin mi?

  // 🔹 "System Message" için özel alanlar
  systemData: {
    recommendations: [{ type: mongoose.Schema.Types.ObjectId, ref: "recommendation" }] // Öneriler

  }
}, { timestamps: true });

module.exports = messageSchema;