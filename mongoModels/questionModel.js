const mongoose = require('mongoose');
// 🗣️ Mesaj Şeması (Kullanıcı ve LLM)
const questionSchema = new mongoose.Schema({
    questionText: { type: String, required: true },  // LLM'in sorduğu soru
    important: { type: String, enum: ["high", "low"] },
    input_type: { type: String },
    options: [{ type: String }],
    answer: { type: String }  // Kullanıcının verdiği cevaplar
}, { timestamps: true });

module.exports = mongoose.model('question', questionSchema);