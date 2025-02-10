const mongoose = require("mongoose");
const imageSchema = require("./imageSchema")
const userSchema = new mongoose.Schema({
  subid: { type: String },
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
  profileImage: { type: imageSchema, default: () => ({}) },  // Varsayılan değer olarak boş bir obje döner,
  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
  account: { type: mongoose.Schema.Types.ObjectId, ref: "accounts", default: null },
  phoneNumbers: [{ // Telefon numaralarını array olarak tanımlama
    type: { type: String, enum: ['mobile', 'home', 'work'] }, // Telefon tipi
    number: { type: String } // Telefon numarası
  }],
  addresses: [{ // Adresleri array olarak tanımlama
    street: { type: String }, // Sokak adı
    city: { type: String }, // Şehir
    state: { type: String }, // Eyalet/Bölge
    zip: { type: String }, // Posta kodu
    country: { type: String } // Ülke
  }],
  socialLinks: {
    facebook: { type: String },
    twitter: { type: String },
    instagram: { type: String }
  },
  appType: { type: String, enum: ['web', 'mobileApp'], required: true }, // Oturumun hangi
  authProvider: { type: String, enum: ['email', 'google'], required: true }, // Kayıt yöntemi alanı
}, { timestamps: true });

module.exports = userSchema;