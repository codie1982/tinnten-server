const mongoose = require("mongoose");

// Teklif Talebi Şeması
const offerRequestSchema = new mongoose.Schema({
  requesterId: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true }, // Talep sahibi
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "company", default: null }, // Belirli bir firmaya mı?

  productId: { type: mongoose.Schema.Types.ObjectId, ref: "product", default: null }, // Ürün talebi
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "service", default: null }, // Hizmet talebi

  description: { type: String, default: "" },               // Talep açıklaması
  priceRange: priceRangeSchema,                             // Fiyat aralığı (isteğe bağlı)
  location: locationSchema,                                 // Lokasyon (isteğe bağlı)
  isGeneral: { type: Boolean, default: true },              // Genel mi yoksa belirli bir firmaya mı?

  status: {                                                 // Talep durumu
    type: String,
    enum: ["pending", "closed", "canceled"],
    default: "pending"
  },
}, { timestamps: true });

module.exports = offerRequestSchema;