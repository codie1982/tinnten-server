
const mongoose = require("mongoose");

// 📊 İlgi Alanı Şeması
const interestSchema = new mongoose.Schema({
  category: { type: String, required: true },                  // İlgi alanı kategorisi (örn: "teknoloji", "spor", "moda")
  keywords: [{ type: String }],                                // Anahtar kelimeler (örn: "iPhone", "akıllı saat")
  score: { type: Number, default: 0 }                          // İlgi seviyesi puanı
},{timestamps:true});


module.exports = interestSchema;