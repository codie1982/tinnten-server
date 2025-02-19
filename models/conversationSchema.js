
const mongoose = require("mongoose");
const { v4: uuidv4 } = require('uuid');
// 📦 Konuşma Şeması
const conversationSchema = new mongoose.Schema({
  conversationid: { type: String, unique: true },                   // Konuşma için benzersiz UUID
  userid: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
  title: { type: String, default: "", required: false },
  messages: [
    { type: mongoose.Schema.Types.ObjectId, ref: "message", required: true, default: [] }
  ],                                                        // Mesajlar
  behaviors: [{ type: mongoose.Schema.Types.ObjectId, ref: "userbehavior", default: [] }],                                                  // Kullanıcı davranışları
  userBehaviorModel: { type: String, default: "" },                                           // Konuşmanın genel bağlamı

  context: { type: String, default: "" },
  memory: { type: String, default: "" },                                           // Konuşmanın genel bağlamı
  status: { type: String, enum: ["active", "completed"], default: "active" },
  delete: { type: Boolean, default: false }
  // Konuşma durumu
}, { timestamps: true });

module.exports = conversationSchema;