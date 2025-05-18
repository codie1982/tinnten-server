const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  companyid: { type: mongoose.Schema.Types.ObjectId, ref: "companyprofiles" },
  title: { type: String, required: true },
  meta: { type: String },
  description: { type: String },
  categories: [{ type: String }],
  isbn: { type: String, index: true },
  // 🎯 Ürün tipi: product | rental | offer_based
  type: {
    type: String,
    enum: ["product", "rental", "offer_based"],
    default: "product"
  },
  // 🎯 Kiralama ayarları
  rentalOptions: {
    basePrice: [{ type: mongoose.Schema.Types.ObjectId, ref: "price" }],
    mode: { type: String, enum: ["continuous", "periodic"] },
    periodType: { type: String, enum: ["daily", "weekly", "monthly", "custom"] }, // optional
    multiplier: {
      type: {
        type: String,
        enum: ["person", "quantity", "custom"]
      },
      value: { type: Number }
    },
    pricingModifiers: { type: mongoose.Schema.Types.Mixed } // özel kural JSON'u
  },
  requestForm: { type: mongoose.Schema.Types.ObjectId, ref: "dynamicform" },
  basePrice: [{ type: mongoose.Schema.Types.ObjectId, ref: "price" }],
  variants: [{ type: mongoose.Schema.Types.ObjectId, ref: "variants" }],
  gallery: { type: mongoose.Schema.Types.ObjectId, ref: "gallery" },
  redirectUrl: [{ type: String }],
  vector: { type: Array },
  attributes: [
    { name: String, value: String }
  ]
}, { timestamps: true });
module.exports = mongoose.model('products', productSchema);