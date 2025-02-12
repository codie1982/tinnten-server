const mongoose = require("mongoose");

// Teklif Talebi Şeması
const offerRequestSchema = new mongoose.Schema({
  requesterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "Service", default: null },
  description: { type: String, default: "" },

  priceRange: {
    minPrice: { type: Number, default: 0 },
    maxPrice: { type: Number, default: 0 },
    currency: { type: String, default: "USD" }
  },

  location: {
    country: { type: String, default: "" },
    city: { type: String, default: "" },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number }
    }
  },

  isGeneral: { type: Boolean, default: true },                // Genel mi, belirli firmalara mı?
  status: {
    type: String,
    enum: ["pending", "closed", "canceled"],
    default: "pending"
  },
}, { timestamps: true });

module.exports = offerRequestSchema;