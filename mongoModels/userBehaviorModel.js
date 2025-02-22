const mongoose = require('mongoose');
// 📊 Kullanıcı Davranışları
const userBehaviorSchema = new mongoose.Schema({
    actionType: {
      type: String,
      enum: ["click", "view", "like", "purchase"],
      required: true
    }, // Kullanıcı eylemi
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    }, // Hedef nesnenin ID'si
    targetType: {
      type: String,
      enum: ["product", "service", "company", "offer", "content"],
      required: true
    }, // Hedef nesnenin türü
    context: {
      type: String,
      default: ""
    }, // Bağlam (örn: "iPhone arayışı")
  }, { timestamps: true });
module.exports = mongoose.model('userbehavior', userBehaviorSchema);;