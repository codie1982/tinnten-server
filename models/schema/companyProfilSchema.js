const mongoose = require("mongoose");

const companySchema = new mongoose.Schema({
  keycloakId: { type: String, required: true }, // Firma sahibinin Keycloak ID'si
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
  social: { type: mongoose.Schema.Types.ObjectId, ref: "social", required: false },
  accounts: [{ type: mongoose.Schema.Types.ObjectId, ref: "accounts", default: null }],
  employees: [{ keycloakId: { type: String, required: true } }], // Çalışanlar sadece Keycloak ID ile tutulur
  certifications: [{ type: String, default: "" }],
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: "products", required: false }],
  documents: [documentSchema],
  galleries: [gallerySchema],
  contents: [contentSchema]
}, { timestamps: true });

module.exports = companySchema;