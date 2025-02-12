const mongoose = require("mongoose");


// 📄 Form Alanı (Field) Şeması
const formFieldSchema = new mongoose.Schema({
  label: { type: String, required: true },                      // Alan adı (örn: "Zemin Türü")
  type: {                                                       // Alan tipi
    type: String,
    enum: ["text", "textarea", "number", "date", "dropdown", "checkbox", "radio", "file"],
    required: true
  },
  required: { type: Boolean, default: false },                  // Zorunlu alan mı?
  options: [{                                                   // Seçimlik alanlar için seçenekler (dropdown, radio)
    label: { type: String },
    value: { type: String },
    showFields: [{ type: mongoose.Schema.Types.ObjectId, ref: "FormField" }] // Bu seçildiğinde gösterilecek alanlar
  }],
  placeholder: { type: String, default: "" },                   // Placeholder metni

  validation: {                                                 // Doğrulama kuralları
    minLength: { type: Number, default: 0 },
    maxLength: { type: Number },
    pattern: { type: String }
  },

  dependencies: [{                                              // Bağlı olduğu alanlar
    fieldId: { type: mongoose.Schema.Types.ObjectId, ref: "FormField" }, // Bağlı olduğu alanın ID'si
    condition: {                                                // Koşul: Eşitlik veya belirli bir değere göre
      operator: { type: String, enum: ["equals", "not_equals"], default: "equals" },
      value: { type: String }
    }
  }]
},{timestamps:true});

module.exports = formFieldSchema;