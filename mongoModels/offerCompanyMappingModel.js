const mongoose = require('mongoose');
// Firma Eşleştirme ve Bildirim Takibi (offerCompanyMappingSchema)
const offerCompanyMappingSchema = new mongoose.Schema({
  offerRequestId: { type: mongoose.Schema.Types.ObjectId, ref: "offerRequest", required: true },
  companyid: { type: mongoose.Schema.Types.ObjectId, ref: "company", required: true },

  // 📧 Bildirim Takibi
  notificationSent: { type: Boolean, default: false },            // Mail gönderildi mi?
  notificationDate: { type: Date, default: null },                // Mail gönderim zamanı

  // 👀 Firma Talebi Görüntüledi mi?
  isViewed: { type: Boolean, default: false },                    // Firma talebi görüntüledi mi?
  viewedAt: { type: Date, default: null },                        // Görüntülenme zamanı

  // 💼 Firma Teklif Verdi mi?
  hasResponded: { type: Boolean, default: false },                // Firma teklif verdi mi?
  respondedAt: { type: Date, default: null }                      // Teklif verme zamanı
});
module.exports = mongoose.model('offercompanymapping', offerCompanyMappingSchema);;