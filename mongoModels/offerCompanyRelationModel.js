const mongoose = require('mongoose');
const offerCompanyRelationSchema = new mongoose.Schema({
  offerRequestId: { type: mongoose.Schema.Types.ObjectId, ref: "offerrequest", required: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "company", required: true },
  status: {
    type: String,
    enum: ["invited", "viewed", "responded", "rejected"], // Firma ile ilişki durumu
    default: "invited"
  },
}, { timestamps: true });

module.exports = mongoose.model('offercompanyreletation', offerCompanyRelationSchema);;