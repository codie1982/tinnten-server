const mongoose = require('mongoose');
// Teklif Talebi Şeması
const offerRequestSchema = new mongoose.Schema({
  userid: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
  productid: { type: mongoose.Schema.Types.ObjectId, ref: "product", default: null },
  serviceid: { type: mongoose.Schema.Types.ObjectId, ref: "service", default: null },
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

  isGeneral: { type: Boolean, default: true },                     // Genel mi, belirli firmalara mı?
  targetCompanyId: { type: mongoose.Schema.Types.ObjectId, ref: "company", default: null },

  dynamicFormId: { type: mongoose.Schema.Types.ObjectId, ref: "dynamicForm" },

  // 🕰️ Teklif Süresi
  offerDeadline: { type: Date, required: true },                  // Teklif verme için son tarih

  // 📤 Bildirim Durumu
  notificationStatus: {
    type: String,
    enum: ["pending", "sent", "failed"],
    default: "pending"
  },

  status: {
    type: String,
    enum: ["pending", "closed", "canceled"],
    default: "pending"
  }

}, { timestamps: true });

module.exports = mongoose.model('offerrequest', offerRequestSchema);;