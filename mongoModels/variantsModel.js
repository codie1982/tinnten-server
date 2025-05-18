const mongoose = require('mongoose');
const variantSchema = new mongoose.Schema({
  price: [{ type: mongoose.Schema.Types.ObjectId, ref: "price" }],// Varyant bazlı fiyat
  images: [{ type: mongoose.Schema.Types.ObjectId, ref: "images" }],
  attributes: [
    {
      name: { type: String },
      value: { type: String }
    }
  ]
}, { timestamps: true });
module.exports = mongoose.model('variants', variantSchema);;