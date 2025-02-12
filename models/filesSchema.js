const mongoose = require("mongoose");
const fileSchema = new mongoose.Schema({
  type: { type: String, enum: ['internal', 'external'], default: 'internal' }, 
  userid: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true }, // Dosya sahibi
  s3Key: { type: String, required: true }, // AWS S3 üzerinde dosyanın anahtarı (örneğin: 'uploads/filename.pdf')
  url: { type: String, required: true },   // S3 erişim URL'si
  fileName: { type: String, required: true }, // Orijinal dosya adı
  mimeType: { type: String, required: true }, // Dosya MIME türü (örneğin: 'application/pdf')
  size: { type: Number, required: true },     // Dosya boyutu (byte cinsinden)
  uploadId: { type: String, default: "" },    // S3 multipart upload için kullanılabilir
  createdAt: { type: Date, default: Date.now }
});


module.exports = fileSchema;