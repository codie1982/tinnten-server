const mongoose = require('mongoose');

const socialSchema = new mongoose.Schema({
    userid: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
    platform: { type: String, required: true },
    link: { type: String },
}, { timestamps: true });
module.exports = mongoose.model('sociallinks', socialSchema);;