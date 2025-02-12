const mongoose = require("mongoose");

const servicesSchema = new mongoose.Schema({
  companyid: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },  // Hizmeti sunan firma
  name: { type: String, required: true },                   // Hizmet adı (örn: Web Sitesi Geliştirme)
  description: { type: String, default: "" },               // Hizmet açıklaması
  categories: [{ type: String }],                           // Hizmet kategorileri (örn: IT, İnşaat)
  features: [{ type: String }],                             // Hizmet özellikleri (örn: SEO Desteği, Responsive Design)
  duration: { type: String, default: "Belirtilmemiş" },     // Tahmini süre (örn: 2 hafta, 3 gün)
  price: { type: mongoose.Schema.Types.ObjectId, ref: "price", required: true }, // Fiyat bilgisi
  gallery: [{ type: mongoose.Schema.Types.ObjectId, ref: "image" }],  // Örnek projeler/görseller
}, { timestamps: true });

module.exports = servicesSchema;