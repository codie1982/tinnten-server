const mongoose = require("mongoose");

const mailVerifySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    token: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: 3600 } // Token 1 saat sonra geçersiz olacak
});

module.exports = mongoose.model("MailVerify", mailVerifySchema);