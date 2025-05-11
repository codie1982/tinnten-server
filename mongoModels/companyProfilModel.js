const mongoose = require('mongoose');
const companySchema = new mongoose.Schema({
  userid: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null }, // Firma sahibinin userid'si
  companyName: { type: String, required: [true, "Please add a Company Name"], default: "" },
  slug: { type: String, unique: true, index: true, required: [true, "Please add a Company Name"] },
  foundedDate: {
    type: Date,
    default: new Date(),
    validate: {
      validator: function (v) {
        return v <= new Date();
      },
      message: "Founded date cannot be in the future."
    }
  },
  description: { type: String, default: "" },
  logo: { type: mongoose.Schema.Types.ObjectId, ref: "images", default: null },
  industry: [{ type: String, required: [true, "Please specify the industry"], default: "" }],
  website: { type: String, default: "" },
  email: { type: String, required: [true, "Please add a contact email"] },
  phone: [{ type: mongoose.Schema.Types.ObjectId, ref: "phones", required: false }],
  address: [{ type: mongoose.Schema.Types.ObjectId, ref: "addresses", required: false }],
  social: [{ type: mongoose.Schema.Types.ObjectId, ref: "sociallinks", required: false }],
  accounts: [{ type: mongoose.Schema.Types.ObjectId, ref: "accounts", default: null }],
  employees: [{ userid: { type: String, ref: "users", required: true } }], // Çalışanlar sadece Keycloak ID ile tutulur
  certifications: [{ type: String }],
  // 🏢 **Firma Türü ve Vergi Bilgileri**
  companyType: {
    type: String,
    enum: ["individual", "corporate"], // Bireysel, Şirket, Resmi
    required: true
  },
  taxOrIdentityNumber: {
    type: String,
    unique: true
  },  // Vergi numarası (şirketler için) veya T.C. kimlik numarası (bireysel firmalar için)
  fieldHistory: {
    companyName: [{ value: String, updatedAt: Date }],
    website: [{ value: String, updatedAt: Date }]
  }
}, { timestamps: true });
module.exports = mongoose.model('companyprofile', companySchema);