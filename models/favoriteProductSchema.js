
const mongoose = require("mongoose");

// ❤️ Sevilen Ürünler Şeması
const favoriteProductSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "product", required: true },
  addedAt: { type: Date, default: Date.now },                  // Ürün ne zaman favorilere eklendi?
  interactionCount: { type: Number, default: 0 }               // Ürünle kaç kez etkileşimde bulunuldu?
}, { timestamps: true });

module.exports = favoriteProductSchema;