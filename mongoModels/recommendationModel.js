const mongoose = require('mongoose');
const recommendationSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ["productRecommendation", "serviceRecommendation", "companyRecommendation"],
        required: true
    }, // Öneri türü

    score: { type: Number, default: 0 },   // Öneri puanı (vektör yakınlığı veya güven skoru)
    groupname: { type: String, default: "" }, // ürün veya servis grubunun ismi
    explanation: { type: String, default: "" }, // Neden önerildiği (örneğin: "Önceki tercihlerine göre önerildi.")
    system_message: { type: String, default: "" }, // Sistem mesajı
    products: {
        main: [{ type: mongoose.Schema.Types.ObjectId, ref: "products", required: false }],
        auxiliary: [{ type: mongoose.Schema.Types.ObjectId, ref: "products", required: false }],
    },  // Ürün önerisi varsa
    services: {
        main: [{ type: mongoose.Schema.Types.ObjectId, ref: "services", required: false }],
        auxiliary: [{ type: mongoose.Schema.Types.ObjectId, ref: "services", required: false }],
    },  // Hizmet önerisi varsa
    companyies: [{ type: mongoose.Schema.Types.ObjectId, ref: "companyprofile", required: false }]   // Firma önerisi varsa
}, { timestamps: true });

module.exports = mongoose.model('recommendation', recommendationSchema);