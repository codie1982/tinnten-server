const mongoose = require('mongoose');
const variantSchema = new mongoose.Schema({
  stock: { type: Number, default: 0 },
  price: [{ type: mongoose.Schema.Types.ObjectId, ref: "price" }],// Varyant bazlı fiyat
  attributes: [
    {
      name: { type: String, required: true },
      value: { type: String, required: true }
    }
  ]
}, { timestamps: true });
module.exports = mongoose.model('variants', variantSchema);;