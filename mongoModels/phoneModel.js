const mongoose = require('mongoose');
const phoneSchema = new mongoose.Schema({
  userid: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
  type: { type: String, enum: ['mobile', 'home', 'work'] }, // Telefon tipi
  number: { type: String }, // Telefon numarası,
  aprove: { type: Boolean, default: false } // Telefon numarası,
}, { timestamps: true });
module.exports = mongoose.model('phones', phoneSchema);