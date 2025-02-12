const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema({
  sku: { type: String, unique: true, required: true },
  stock: { type: Number, default: 0 },
  price: priceSchema,                                      // Varyant bazlı fiyat
  attributes: [
    { name: { type: String, required: true }, value: { type: String, required: true } }
  ]
},{timestamps:true});

module.exports = variantSchema;