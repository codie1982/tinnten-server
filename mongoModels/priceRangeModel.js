const mongoose = require('mongoose');
// Teklif Talebi Şeması
const pricerangeSchema = new mongoose.Schema({
  minPrice: { type: Number, default: 0 },                // Minimum fiyat
  maxPrice: { type: Number, default: 0 },                // Maksimum fiyat
  currency: { type: String, default: "USD" }
}, { timestamps: true });

module.exports = mongoose.model('pricerange', pricerangeSchema);;