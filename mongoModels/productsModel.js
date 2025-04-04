const mongoose = require('mongoose');
const productsSchema = new mongoose.Schema({
    companyid: { type: mongoose.Schema.Types.ObjectId, ref: "companyprofil", required: false },
    title: { type: String, required: true },
    meta: { type: String },
    description: { type: String, default: "" },
    categories: [{ type: String }],
    basePrice: [{ type: mongoose.Schema.Types.ObjectId, ref: "price" }],                                  // Ana ürün fiyatı
    variants: [{ type: mongoose.Schema.Types.ObjectId, ref: "variants" }], // Varyantlar (her biri kendi fiyatına sahip olabilir)
    gallery: { type: mongoose.Schema.Types.ObjectId, ref: "gallery" },
    redirectUrl: [{ type: String }],
    vector: { type: Array, required: false },
    attributes: [
        { name: { type: String, required: true }, value: { type: String, required: true } }
    ],
}, { timestamps: true });
module.exports = mongoose.model('products', productsSchema);