const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  keyid: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('users', userSchema);;