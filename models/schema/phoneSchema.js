const mongoose = require("mongoose");

const phoneSchema = new mongoose.Schema({
  userid: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
  type: { type: String, enum: ['mobile', 'home', 'work'] }, // Telefon tipi
  number: { type: String } // Telefon numarası,
}, { timestamps: true });

module.exports = phoneSchema;