
const mongoose = require("mongoose");



// 💼 İlgi Alanı İşler (Potential Interests)
const potentialInterestSchema = new mongoose.Schema({
  jobType: { type: String, required: true },                   // İş türü (örn: "freelance", "tam zamanlı", "danışmanlık")
  relatedFields: [{ type: String }],                           // İlgili alanlar (örn: "web geliştirme", "grafik tasarım")
  confidenceScore: { type: Number, default: 0.5 }              // İlgilenme olasılığı (0-1 arası bir değer)
}, { timestamps: true });
module.exports = potentialInterestSchema;