const mongoose = require('mongoose');
const fileSchema = new mongoose.Schema({
  type: { type: String, enum: ['internal', 'external'], default: 'internal' },
  userid: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true }, // Dosya sahibi
  path: { type: String, default: "" },
  uploadid: { type: String }
}, { timestamps: true });
module.exports = mongoose.model('files', fileSchema);