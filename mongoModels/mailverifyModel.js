const mongoose = require('mongoose');

const mailVerifySchema = new mongoose.Schema({
    userid: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
    code: { type: String, required: true },
    expireDate: { type: Date, default: Date.now, expires: 180 } // Kod 3dk sonra geçersiz olacak
}, { timestamps: true });
module.exports = mongoose.model('mailverify', mailVerifySchema);;