
const mongoose = require("mongoose");

// 📦 Konuşma Şeması
const conversationSchema = new mongoose.Schema({
  conversationId: { type: String, default: uuidv4, unique: true },                   // Konuşma için benzersiz UUID
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  messages: [messageSchema],                                                        // Mesajlar
  behaviors: [userBehaviorSchema],                                                  // Kullanıcı davranışları
  questionAnswers: [questionAnswerSchema],                                          // Soru-cevap kayıtları

  recommendations: [{                                                              // Öneriler
    type: { type: String, enum: ["product", "service", "company"], required: true },
    referenceId: { type: mongoose.Schema.Types.ObjectId, required: true },
    score: { type: Number, default: 0 },
    explanation: { type: String, default: "" }
  }],

  context: { type: String, default: "" },                                           // Konuşmanın genel bağlamı
  status: { type: String, enum: ["active", "completed"], default: "active" },       // Konuşma durumu
}, { timestamps: true });

module.exports = conversationSchema;