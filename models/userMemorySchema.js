
const mongoose = require("mongoose");

// 📊 İlgi Alanı Şeması
const interestSchema = new mongoose.Schema({
  category: { type: String, required: true },                  // İlgi alanı kategorisi (örn: "teknoloji", "spor", "moda")
  keywords: [{ type: String }],                                // Anahtar kelimeler (örn: "iPhone", "akıllı saat")
  score: { type: Number, default: 0 }                          // İlgi seviyesi puanı
});

// ❤️ Sevilen Ürünler Şeması
const favoriteProductSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  addedAt: { type: Date, default: Date.now },                  // Ürün ne zaman favorilere eklendi?
  interactionCount: { type: Number, default: 0 }               // Ürünle kaç kez etkileşimde bulunuldu?
});

// 💼 İlgi Alanı İşler (Potential Interests)
const potentialInterestSchema = new mongoose.Schema({
  jobType: { type: String, required: true },                   // İş türü (örn: "freelance", "tam zamanlı", "danışmanlık")
  relatedFields: [{ type: String }],                           // İlgili alanlar (örn: "web geliştirme", "grafik tasarım")
  confidenceScore: { type: Number, default: 0.5 }              // İlgilenme olasılığı (0-1 arası bir değer)
});

// 🧠 Kullanıcı Hafıza Şeması
const userMemorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  interests: [interestSchema],                                 // Kullanıcının ilgi alanları
  favoriteProducts: [favoriteProductSchema],                   // Kullanıcının sevdiği ürünler
  potentialInterests: [potentialInterestSchema],               // Potansiyel ilgi alanları ve işler

  preferences: {                                               // Genel kullanıcı tercihleri
    preferredLanguage: { type: String, default: "tr" },
    preferredCurrency: { type: String, default: "TRY" },
    priceSensitivity: { type: Number, default: 0.5 }           // Fiyat hassasiyeti (0: düşük, 1: yüksek)
  },

  behaviorSummary: {                                           // Kullanıcı davranış özetleri
    mostViewedCategory: { type: String, default: "" },
    frequentlyInteractedProduct: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    lastActive: { type: Date, default: Date.now }
  },
},{timestamps:true});

module.exports = conversationSchema;