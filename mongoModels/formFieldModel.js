const mongoose = require('mongoose');
// 📄 Form Alanı (Field) Şeması
const formFieldSchema = new mongoose.Schema({
  label: { type: String, required: true },                      // Alan adı (örn: "Zemin Türü")
  uuid: { type: String, required: true },         
  type: {
    type: String,
    enum: ["text", "textarea", "number", "date", "dropdown", "checkbox", "radio", "file"],
    required: true
  },

  required: { type: Boolean, default: false },

  placeholder: { type: String, default: "" },

  options: [{
    label: { type: String },
    value: { type: String },
    showFields: [{ type: String }] // UUID ile eşleşen field ID'leri
  }],

  validation: {
    minLength: { type: Number, default: 0 },
    maxLength: { type: Number },
    pattern: { type: String }
  },

  // === 📌 Yeni: UUID tabanlı dependency desteği ===
  dependencies: [{
    fieldid: { type: String }, // UUID (client tarafından belirleniyor)
    condition: {
      operator: {
        type: String,
        enum: [
          "equals", "not_equals",
          "greater_than", "less_than",
          "before", "after",
          "contains", "not_contains"
        ],
        default: "equals"
      },
      value: { type: String }
    }
  }],

  locationType: {
    type: String,
    enum: ["point", "area", "none"],
    default: "none"
  },
  vector: { type: Array },
}, { timestamps: true });
module.exports = mongoose.model('formfield', formFieldSchema);