const mongoose = require('mongoose');
const priceSchema = new mongoose.Schema({
  originalPrice: { type: Number, required: true },         // İlk fiyat
  discountRate: { type: Number, default: 0 },              // İndirim oranı (%) 
  discountedPrice: {                                       // İndirimli fiyat (otomatik hesaplanır)
    type: Number,
    default: function () {
      return this.originalPrice - (this.originalPrice * (this.discountRate / 100));
    }
  },
  currency: { type: String, default: "TL" },               // Para birimi
  isOfferable: { type: Boolean, default: false },  // Teklif istenebilir mi?
  requestRequired: { type: Boolean, default: false }      // Fiyat görmek için teklif gerekli mi?
}, { timestamps: true });
module.exports = mongoose.model('price', priceSchema);;