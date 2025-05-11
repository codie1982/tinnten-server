const mongoose = require("mongoose");
const usageLogSchema = new mongoose.Schema({
  accountid: { type: mongoose.Schema.Types.ObjectId, ref: "accounts", required: true },
  type: {
    type: String,
    enum: [
      'file.upload', 'file.download',
      'image.upload', 'image.download',
      'video.upload', 'video.download',
      'offer.generate', 'llm.token', 'token_limit.token'
    ],
    required: true
  },
  amount: { type: Number, default: 1 },
  metadata: { type: mongoose.Schema.Types.Mixed }, // örn: dosya adı, işlem tipi, kaynak vs.
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model("usagelog", usageLogSchema);