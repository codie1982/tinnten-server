const mongoose = require('mongoose');
const servicesSchema = new mongoose.Schema({
  companyid: { type: mongoose.Schema.Types.ObjectId, ref: "companyprofil", required: false },  // Hizmeti sunan firma
  name: { type: String, required: true },                   // Hizmet adı (örn: Web Sitesi Geliştirme)
  description: { type: String, default: "" },               // Hizmet açıklaması
  categories: [{ type: String }],                           // Hizmet kategorileri (örn: IT, İnşaat)
  features: [{ type: String }],                             // Hizmet özellikleri (örn: SEO Desteği, Responsive Design)
  duration: { type: String, default: "Belirtilmemiş" },     // Tahmini süre (örn: 2 hafta, 3 gün)
  price: { type: mongoose.Schema.Types.ObjectId, ref: "price", required: false }, // Fiyat bilgisi
  gallery: [{ type: mongoose.Schema.Types.ObjectId, ref: "gallery" }],  // Örnek projeler/görseller

  // 📍 Hizmetin Lokasyon Durumu
  isLocationBased: { type: Boolean, default: false },       // Hizmet belirli bir bölgeye mi bağlı?
  
  location: {
    province: { type: String, default: "" },                 // Ülke
    district: { type: String, default: "" },                 // Şehir
    coordinates: {
      lat: { type: Number },
      lng: { type: Number }
    }
  }

}, { timestamps: true });
module.exports = mongoose.model('services', servicesSchema);