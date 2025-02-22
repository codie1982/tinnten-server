const mongoose = require('mongoose');
// Teklif Talebi Şeması
const bidlocationSchema = new mongoose.Schema({
  country: { type: String, default: "" },                // Ülke
  city: { type: String, default: "" },                   // Şehir
  coordinates: {                                         // Koordinatlar (isteğe bağlı)
    lat: { type: Number },
    lng: { type: Number }
  }
}, { timestamps: true });
module.exports = mongoose.model('bidlocation', bidlocationSchema);;