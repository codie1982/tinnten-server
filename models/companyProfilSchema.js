const mongoose = require("mongoose");

const companySchema = new mongoose.Schema({
  userid: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null }, // Firma sahibinin userid'si
  companyName: { type: String, required: [true, "Please add a Company Name"], default: "" },
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
  industry: { type: String, required: [true, "Please specify the industry"], default: "" },
  website: { type: String, default: "" },
  email: { type: String, required: [true, "Please add a contact email"], default: "" },
  phone: [{ type: mongoose.Schema.Types.ObjectId, ref: "phone", required: false }],
  address: [{ type: mongoose.Schema.Types.ObjectId, ref: "address", required: false }],
  social: [{ type: mongoose.Schema.Types.ObjectId, ref: "social", required: false }],
  accounts: [{ type: mongoose.Schema.Types.ObjectId, ref: "accounts", default: null }],
  employees: [{ userid: { type: String, required: true } }], // Çalışanlar sadece Keycloak ID ile tutulur
  certifications: [{ type: String, default: "" }],

  products: [{ type: mongoose.Schema.Types.ObjectId, ref: "products", required: false }],
  services: [{ type: mongoose.Schema.Types.ObjectId, ref: "services", required: false }],   
  documents: [{ type: mongoose.Schema.Types.ObjectId, ref: "documents", required: false }],
  galleries: [{ type: mongoose.Schema.Types.ObjectId, ref: "gallery", required: false }],
  contents: [{ type: mongoose.Schema.Types.ObjectId, ref: "content", required: false }],

  // 🏢 **Firma Türü ve Vergi Bilgileri**
  companyType: {
    type: String,
    enum: ["individual", "corporate"], // Bireysel, Şirket, Resmi
    required: true
  },
  taxOrIdentityNumber: { 
    type: String, 
    required: true,
    unique: true 
  },  // Vergi numarası (şirketler için) veya T.C. kimlik numarası (bireysel firmalar için)

}, { timestamps: true });

module.exports = companySchema;