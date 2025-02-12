const mongoose = require("mongoose");

const profilSchema = new mongoose.Schema({
  userid: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
  firstname: { type: String, default: "", required: [true, "Please add a your name"] },
  lastname: { type: String, default: "", required: [true, "Please add a Family Name"] },
  birthdate: {
    type: Date,
    default: new Date(),
    validate: {
      validator: function (v) {
        return v <= new Date();
      },
      message: "Doğum tarihi gelecekte olamaz."
    }
  },
  bio: { type: String, default: "" },
  genre: { type: String, enum: ['man', 'woman', 'pointout'], default: 'pointout' },
  profileImage: { type: mongoose.Schema.Types.ObjectId, ref: "images", default: null },  // Varsayılan değer olarak boş bir obje döner,
  account: [{ type: mongoose.Schema.Types.ObjectId, ref: "accounts", default: null }],
  phone: [{ type: mongoose.Schema.Types.ObjectId, ref: "phone", required: false }],
  addres: [{ type: mongoose.Schema.Types.ObjectId, ref: "addres", required: false }],
  social: { type: mongoose.Schema.Types.ObjectId, ref: "social", required: false },
}, { timestamps: true });

module.exports = profilSchema;