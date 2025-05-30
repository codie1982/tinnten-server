const mongoose = require('mongoose');
// Teklif Talebi Şeması
const offerRequestSchema = new mongoose.Schema({
  userid: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
  productid: { type: mongoose.Schema.Types.ObjectId, ref: "product", default: null },
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

  isGeneral: { type: Boolean, default: true },
  targetCompanyId: { type: mongoose.Schema.Types.ObjectId, ref: "company", default: null },
  dynamicFormId: { type: mongoose.Schema.Types.ObjectId, ref: "dynamicForm" },

  // 🕰️ Teklif Süresi
  offerDeadline: { type: Date, required: true },

  // 📤 Bildirim Durumu
  notificationStatus: {
    type: String,
    enum: ["pending", "sent", "failed"],
    default: "pending"
  },

  // 💬 Süreç Aşaması
  state: {
    type: String,
    enum: ["makeform", "search", "answerform", "generalinfo", "completed"],
    default: "makeform"
  },

  // 🧾 Genel Durum
  status: {
    type: String,
    enum: ["pending", "closed", "canceled"],
    default: "pending"
  },

  // ✅ YENİ: Kullanıcı Tercihleri
  contactPreference: {
    type: String,
    enum: ["tinnten", "email", "phone", "whatsapp"],
    default: "tinnten"
  },

  contactInfo: {
    phone: { type: String, default: "" },
    email: { type: String, default: "" }
  },

  validUntil: { type: Date },               // Talebin geçerli olduğu en son tarih
  maxOfferCount: { type: Number, default: 10 }, // En fazla kaç teklif almak istiyor
  additionalNote: { type: String, default: "" } // Ek açıklama (isteğe bağlı)

}, { timestamps: true });

module.exports = mongoose.model('offerrequest', offerRequestSchema);