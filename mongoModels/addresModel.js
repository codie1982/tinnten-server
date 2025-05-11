const mongoose = require('mongoose');
const addresSchema = new mongoose.Schema({
  userid: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
  street: { type: String }, // Sokak adı
  city: { type: String }, // Şehir
  state: { type: String }, // Eyalet/Bölge
  zip: { type: String }, // Posta kodu
  country: { type: String }, // Ülke,
  location: {
    coordinates: {
      lat: { type: Number },
      lng: { type: Number }
    }
  }
}, { timestamps: true });
module.exports = mongoose.model('addresses', addresSchema);;