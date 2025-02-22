const mongoose = require('mongoose');
const imageSchema = new mongoose.Schema({
    type: { type: String, enum: ['internal', 'external'], default: 'internal' },
    userid: { type: mongoose.Schema.Types.ObjectId,ref:"users" },
    path: { type: String, default: "" },
    uploadid: { type: String }
  });
module.exports = mongoose.model('images', imageSchema);;