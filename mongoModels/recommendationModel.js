const mongoose = require('mongoose');
const recommendationSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ["productRecommendation", "serviceRecommendation", "companyRecommendation"],
        required: true
    }, // Öneri türü

    score: { type: Number, default: 0 },   // Öneri puanı (vektör yakınlığı veya güven skoru)
    explanation: { type: String, default: "" }, // Neden önerildiği (örneğin: "Önceki tercihlerine göre önerildi.")

    products: [{ type: mongoose.Schema.Types.ObjectId, ref: "products", required: false }],  // Ürün önerisi varsa
    services: [{ type: mongoose.Schema.Types.ObjectId, ref: "services", required: false }],  // Hizmet önerisi varsa
    companyies: [{ type: mongoose.Schema.Types.ObjectId, ref: "companyprofile", required: false }]   // Firma önerisi varsa
}, { timestamps: true });

module.exports = mongoose.model('recommendation', recommendationSchema);