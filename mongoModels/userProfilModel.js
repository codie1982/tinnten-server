const mongoose = require('mongoose');
const profilSchema = new mongoose.Schema({
  userid: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
  firstname: { type: String, default: "", required: false },
  lastname: { type: String, default: "", required: false },
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
  profileImage: { type: mongoose.Schema.Types.ObjectId, ref: "images", default: "" },  // Varsayılan değer olarak boş bir obje döner,
  accounts: [{ type: mongoose.Schema.Types.ObjectId, ref: "accounts", default: null }],
  phones: [{ type: mongoose.Schema.Types.ObjectId, ref: "phones" }],
  address: [{ type: mongoose.Schema.Types.ObjectId, ref: "addresses" }],
  sociallinks: [{ type: mongoose.Schema.Types.ObjectId, ref: "sociallinks" }],
}, { timestamps: true });

module.exports = mongoose.model('userprofile', profilSchema);