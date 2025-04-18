const mongoose = require('mongoose');
const recommendationSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ["recommendation", "question"],
        required: true
    }, // Öneri türü
    score: { type: Number, default: 0 },   // Öneri puanı (vektör yakınlığı veya güven skoru)
    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: "question", default: null }],
    producsGroup: [
        {
            groupname: { type: String, default: "" }, // ürün veya servis grubunun ismi
            explanation: { type: String, default: "" }, // Neden önerildiği (örneğin: "Önceki tercihlerine göre önerildi.")
            products: {
                main: [{ type: mongoose.Schema.Types.ObjectId, ref: "products", required: false }],
                auxiliary: [{ type: mongoose.Schema.Types.ObjectId, ref: "products", required: false }],
            }
        },  // Ürün önerisi varsa
    ],
    servicesGroup: [
        {
            groupname: { type: String, default: "" }, // ürün veya servis grubunun ismi
            explanation: { type: String, default: "" }, // Neden önerildiği (örneğin: "Önceki tercihlerine göre önerildi.")
            services: {
                main: [{ type: mongoose.Schema.Types.ObjectId, ref: "services", required: false }],
                auxiliary: [{ type: mongoose.Schema.Types.ObjectId, ref: "services", required: false }],
            },  // Hizmet önerisi varsa
        }
    ],
    companyGroup: [
        {
            companyies: [{ type: mongoose.Schema.Types.ObjectId, ref: "companyprofile", required: false }]   // Firma önerisi varsa
        }
    ]
}, { timestamps: true });

module.exports = mongoose.model('recommendation', recommendationSchema);