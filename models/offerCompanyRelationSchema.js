const mongoose = require("mongoose");

const offerCompanyRelationSchema = new mongoose.Schema({
  offerRequestId: { type: mongoose.Schema.Types.ObjectId, ref: "OfferRequest", required: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  status: {
    type: String,
    enum: ["invited", "viewed", "responded", "rejected"], // Firma ile ilişki durumu
    default: "invited"
  },
}, { timestamps: true });

module.exports = bidlocationSchema;