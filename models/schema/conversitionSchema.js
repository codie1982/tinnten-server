const mongoose = require("mongoose");

const conversitionScheme = new mongoose.Schema({
  conversationid: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true, },
  title: {
    type: String,
    default: ""
  }
}, { timestamps: true });

module.exports = conversitionScheme;