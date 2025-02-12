const mongoose = require("mongoose");

const favoriteSchema = new mongoose.Schema({
  userid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Kullanıcı referansı
    required: true
  },
  favoriteType: {
    type: String,
    enum: ['album', 'performer', 'song'], // Favori içerik türleri
    required: true
  },
  album: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Album', // Albüm referansı
    required: function () {
      return this.favoriteType === 'album';
    }
  },
  performer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Performer', // Performans sanatçısı referansı
    required: function () {
      return this.favoriteType === 'performer';
    }
  },
  song: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Song', // Şarkı referansı
    required: function () {
      return this.favoriteType === 'song';
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = favoriteSchema;