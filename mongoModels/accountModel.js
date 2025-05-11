const mongoose = require("mongoose");
const accountSchema = new mongoose.Schema({
  userid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  packages: [{
    packageid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'system-packages',
      required: true
    },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    expiredAt: { type: Date }, // süresi kontrol için
  }],
  usage: {
    file: {
      upload: { type: Number, default: 0 },
      download: { type: Number, default: 0 },
      lastReset: { type: Date, default: Date.now }
    },
    image: {
      upload: { type: Number, default: 0 },
      download: { type: Number, default: 0 },
      lastReset: { type: Date, default: Date.now }
    },
    video: {
      upload: { type: Number, default: 0 },
      download: { type: Number, default: 0 },
      lastReset: { type: Date, default: Date.now }
    },
    offer: {
      count: { type: Number, default: 0 },
      lastReset: { type: Date, default: Date.now }
    },
    llm: {
      token: { type: Number, default: 0 },
      lastReset: { type: Date, default: Date.now }
    },
    token_limit: {
      token: { type: Number, default: 0 },
      lastReset: { type: Date, default: Date.now }
    }
  },
  balance: {
    currency: { type: String, enum: ['TRY', 'USD', 'CREDIT'], default: 'CREDIT' },
    amount: { type: Number, default: 0, min: 0 },
    lastUpdated: { type: Date, default: Date.now },
    history: [{
      type: { type: String, enum: ['topup', 'spend', 'refund'], required: true },
      amount: { type: Number, required: true },
      reason: { type: String },
      createdAt: { type: Date, default: Date.now }
    }]
  }
}, { timestamps: true });

module.exports = mongoose.model("accounts", accountSchema);