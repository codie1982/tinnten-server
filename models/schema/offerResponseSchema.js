const mongoose = require("mongoose");

// Teklif Talebi Şeması
const offerResponseSchema = new mongoose.Schema({
  offerRequestId: { type: mongoose.Schema.Types.ObjectId, ref: "OfferRequest", required: true }, // İlgili teklif talebi
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },           // Yanıtı veren firma
  responderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },            // Yanıtı veren kişi (firma çalışanı)

  price: { type: Number, required: true },                                                      // Teklif edilen fiyat
  currency: { type: String, default: "USD" },                                                   // Para birimi
  description: { type: String, default: "" },                                                   // Teklif açıklaması

  estimatedStartDate: { type: Date, required: true },                                           // Tahmini başlama tarihi
  estimatedEndDate: { type: Date, required: true },                                             // Tahmini bitiş tarihi                                               // Son güncellenme tarihi
}, { timestamps: true });

module.exports = offerResponseSchema;