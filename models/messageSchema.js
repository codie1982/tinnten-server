const mongoose = require("mongoose");

// 🗣️ Mesaj Şeması (Kullanıcı ve LLM)
const messageSchema = new mongoose.Schema({
  type: { type: String, enum: ["human_message", "system_message"], required: true }, // Mesaj tipi
  content: { type: String, required: true },                                         // Mesaj içeriği
  timestamp: { type: Date, default: Date.now },                                      // Mesaj zamanı
  intent: { type: String, default: "" },                                             // LLM niyet analizi
  entities: [{ type: String }],                                                     // Varlıklar (örn: ürün adı)
  includeInContext: { type: Boolean, default: true }                                 // Bağlama dahil edilsin mi?
});

module.exports = messageSchema;