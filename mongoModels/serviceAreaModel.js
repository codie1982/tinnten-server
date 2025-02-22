const mongoose = require('mongoose');
// 🌍 Hizmet Bölgesi (Service Area) Şeması
const serviceAreaSchema = new mongoose.Schema({
    country: { type: String, required: true },                                // Ülke (örn: "Türkiye")
    city: { type: String },                                                   // Şehir (örn: "İstanbul")
    region: { type: String },                                                 // Bölge (örn: "Marmara")
    coordinates: {                                                            // Koordinat tabanlı hizmet alanı (örn: belirli bir mesafe)
      latitude: { type: Number },
      longitude: { type: Number },
      radius: { type: Number }                                                // KM cinsinden yarıçap
    }
  }, { timestamps: true });
module.exports = mongoose.model('servicesarea', serviceAreaSchema);;