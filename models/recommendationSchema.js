const mongoose = require("mongoose");


const recommendationSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ["productRecommendation", "serviceRecommendation", "companyRecommendation"], 
    required: true 
  }, // Öneri türü

  score: { type: Number, default: 0 },   // Öneri puanı (vektör yakınlığı veya güven skoru)
  explanation: { type: String, default: "" }, // Neden önerildiği (örneğin: "Önceki tercihlerine göre önerildi.")

  productid: { type: mongoose.Schema.Types.ObjectId, ref: "product", required: false },  // Ürün önerisi varsa
  serviceid: { type: mongoose.Schema.Types.ObjectId, ref: "service", required: false },  // Hizmet önerisi varsa
  companyid: { type: mongoose.Schema.Types.ObjectId, ref: "company", required: false }   // Firma önerisi varsa
}, { timestamps: true });

module.exports = recommendationSchema;