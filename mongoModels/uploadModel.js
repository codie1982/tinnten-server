const mongoose = require("mongoose");
const uploadSchema = new mongoose.Schema({
    userid: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
    uploadid: { type: String },
    uploadType: { type: String, enum: ["song", "video", "image", "file"] },
    upload_size: { type: Number },
    upload_unit: { type: String },
    data: { type: mongoose.Schema.Types.Mixed },
    file: { type: mongoose.Schema.Types.Mixed },
    success: { type: Boolean },
}, { timestamps: true });
module.exports = mongoose.model("uploads", uploadSchema);