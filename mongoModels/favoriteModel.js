const mongoose = require('mongoose');
const favoriteSchema = new mongoose.Schema({
  userid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Kullanıcı referansı
    required: true
  },
  favoriteType: {
    type: String,
    enum: ['product', 'services', 'company'], // Favori içerik türleri
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'product', // Albüm referansı
    required: function () {
      return this.favoriteType === 'product';
    }
  },
  services: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'services', // Albüm referansı
    required: function () {
      return this.favoriteType === 'services';
    }
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'company', // Albüm referansı
    required: function () {
      return this.favoriteType === 'company';
    }
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });
module.exports = mongoose.model('favorite', favoriteSchema);;