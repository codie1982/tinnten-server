const mongoose = require('mongoose');
// 🗣️ Mesaj Şeması (Kullanıcı ve LLM)
const messageSchema = new mongoose.Schema({
  type: { type: String, enum: ["human_message", "system_message"], required: true }, // Mesaj türü
  conversationid: { type: String, required: true }, // Konuşma ID'si
  userid: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true }, // Kullanıcı ID'si
  parentid: { type: mongoose.Schema.Types.ObjectId, ref: "message", required: false, default: null }, // parent Message ID'si
  groupid: { type: String, required: true },
  content: { type: String, required: false, default: "" },  // Mesaj içeriği
  intent: { type: String, default: "" }, // LLM niyet analizi
  //entities: [{ type: String }], // Örneğin: Ürün ismi, hizmet ismi
  //includeInContext: { type: Boolean, default: true }, // Bağlama dahil edilsin mi?
  //productionQuestions: [{ type: mongoose.Schema.Types.ObjectId, ref: "question" }], // LLM'in sorduğu sorunun ID'si
  //servicesQuestions: [{ type: mongoose.Schema.Types.ObjectId, ref: "question" }], // LLM'in sorduğu sorunun ID'si
  //search_context: [{ type: String }], // arama terimleri
  //action: { type: String }, // eylemler
  // 🔹 "System Message" için özel alanlar
  recommendation: { type: mongoose.Schema.Types.ObjectId, ref: "recommendation", default: null } // Öneriler
}, { timestamps: true });
module.exports = mongoose.model('message', messageSchema);