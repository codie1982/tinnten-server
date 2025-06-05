const mongoose = require('mongoose');
const conversationSchema = new mongoose.Schema({
conversationid: { type: String, unique: true },                   // Konuşma için benzersiz UUID
  userid: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
  title: { type: String, default: "", required: false },
 /*  messages: [    { type: String, required: true, default: [] }  ], */ // Mesajlar
  summary: { type: String, default: "no summary" },                                           // Konuşmanın genel bağlamı
  status: { type: String, enum: ["active", "completed"], default: "active" },
  delete: { type: Boolean, default: false }
  // Konuşma durumu
}, { timestamps: true });
module.exports = mongoose.model('conversation', conversationSchema);