const mongoose = require('mongoose');

// 🚀 Öne Çıkarılan Firma (Promotion) Şeması
const promotionCompanySchema = new mongoose.Schema({
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true }, // Öne çıkarılan firma
  
    isActive: { type: Boolean, default: false },                    // Promosyon aktif mi?
    priority: { type: Number, default: 1 },                         // Öncelik seviyesi (1 = en yüksek öncelik)
    budget: { type: Number, required: true },                       // Bütçe (örn: tıklama başına maliyet)
    costPerClick: { type: Number, default: 0.5 },                   // Tıklama başına maliyet (CPC)
    totalClicks: { type: Number, default: 0 },                      // Toplam tıklama sayısı
    maxClicks: { type: Number, default: 1000 },                     // Maksimum tıklama sınırı
  
    targeting: {                                                    // Hedefleme Kriterleri
      keywords: [{ type: String }],                                 // Anahtar kelimeler (örn: "iPhone", "nakliyat")
      categories: [{ type: String }],                               // Hedeflenen kategoriler
      regions: [{ country: String, city: String }],                 // Coğrafi hedefleme (ülke/şehir)
      devices: [{ type: String, enum: ["mobile", "desktop", "tablet"] }] // Cihaz hedefleme (isteğe bağlı)
    },
  
    startDate: { type: Date, required: true },                      // Başlangıç tarihi
    endDate: { type: Date, required: true },                        // Bitiş tarihi
    paymentStatus: { type: String, enum: ["pending", "completed", "failed"], default: "pending" }, // Ödeme durumu
  
  }, { timestamps: true });

module.exports = mongoose.model('promotioncompany', promotionCompanySchema);;