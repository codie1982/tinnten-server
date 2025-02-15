const mongoose = require("mongoose");
const accountSchema = new mongoose.Schema({
  userid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user', // Kullanıcı referansı
    required: true
  },
  packages: [{
    packageid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'system-packages', // İlişkili olduğu Package koleksiyonuna referans
      required: true
    },
    isActive: {
      type: Boolean,
      default: true // Paket geçerli mi, süre dolduğunda false olabilir
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
  }]
}, { timestamps: true });

module.exports = accountSchema;