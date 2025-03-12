const mongoose = require('mongoose');


// Oturum şeması tanımlama
const mailLogSchema = new mongoose.Schema({
  messageinfo: { type: mongoose.Schema.Types.Mixed },
  from: { type: String, required: true },
  to: { type: String, required: true },
  subject: { type: String, required: true },
  text: { type: String, required: true },
  emailType: { type: String },
  status: { type: String, enum: ["failed", "sent"],default:"sent" },
  error: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('maillog', mailLogSchema);;