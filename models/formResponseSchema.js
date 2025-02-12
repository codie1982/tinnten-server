const mongoose = require("mongoose");


// 📄 Teklif Formu Cevap Şeması
const formResponseSchema = new mongoose.Schema({
  offerRequestId: { type: mongoose.Schema.Types.ObjectId, ref: "offerRequest", required: true }, // Hangi teklif talebine ait?
  formId: { type: mongoose.Schema.Types.ObjectId, ref: "dynamicForm", required: true },         // Hangi formdan geldi?
  fieldId: { type: mongoose.Schema.Types.ObjectId, ref: "formField", required: true },          // Hangi form alanına ait?

  answer: {                                                                                    // Kullanıcının cevabı
    type: mongoose.Schema.Types.Mixed,                                                         // Farklı veri tipleri için esnek yapı
    required: true
  },

  isValid: { type: Boolean, default: true },                                                   // Doğrulama sonrası geçerli mi?
  validationMessage: { type: String, default: "" },                                            // Doğrulama hatası varsa mesaj

}, { timestamps: true });

module.exports = formResponseSchema;