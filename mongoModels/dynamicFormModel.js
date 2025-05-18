const mongoose = require('mongoose');
// 📦 Dinamik Teklif Formu Şeması
const dynamicFormSchema = new mongoose.Schema({
  companyid: { type: mongoose.Schema.Types.ObjectId, ref: "company", required: true }, // Hangi firmaya ait?
  formName: { type: String, required: true },                                         // Form adı
  description: { type: String, default: "" },                                         // Form açıklaması
  fields: [ { type: mongoose.Schema.Types.ObjectId, ref: "formfield", required: true }],                                                          // Formun alanları
},{timestamps:true});
module.exports = mongoose.model('dynamicform', dynamicFormSchema);