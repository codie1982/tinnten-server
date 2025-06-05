const mongoose = require('mongoose');
// 🗣️ Mesaj Şeması (Kullanıcı ve LLM)
const messageSchema = new mongoose.Schema({
  conversationid: { type: String, required: true }, // Konuşma ID'si
  messageid: { type: String, unique: true }, // Mesaj için benzersiz UUID
  userid: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true }, // Kullanıcı ID'si
  parentid: { type: mongoose.Schema.Types.ObjectId, ref: "message", required: false, default: null }, // parent Message ID'si
  human_message: { type: String, required: false, default: "" }, // Kullanıcı mesajı
  system_message: { type: String, required: false, default: "" }, // LLM mesajı
  intents: [{ type: mongoose.Schema.Types.Mixed, default: null }], // LLM niyet analizi
  orchestratorresponse: { type: mongoose.Schema.Types.Mixed, default: null }, // LLM niyet analizi
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
}, { timestamps: true });
module.exports = mongoose.model('message', messageSchema);