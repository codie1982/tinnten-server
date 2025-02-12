const mongoose = require("mongoose");

const packageSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 100 },
  title: { type: String, required: true, trim: true, minlength: 3, maxlength: 100 },
  description: { type: String, maxlength: 500, required: true, default: '' },
  price: {
    amount: { type: Number, min: 0, default: 0 },
    currency: { type: String, enum: ['USD', 'TRY'], default: 'USD' }
  },
  features: [{ item: { type: String } }],
  buissness: { type: Boolean, default: true },
  category: { type: String, enum: ['free', 'basic', 'premium', 'enterprise'], default: "free" },
  package_content_type: { type: String, enum: ["standart", "multisubscribe", "student"], default: "standart" },
  limit: {
    product: {
      max: { type: Number, min: 0, default: 100 },
    },
    services: {
      max: { type: Number, min: 0, default: 100 },
    },
    file: {
      download: { type: Number, min: 0, default: 512 },
      upload: { type: Number, min: 0, default: 512 },
      maxfileupload: { type: Number, min: 0, default: 20 },
      maxfileDownload: { type: Number, min: 0, default: 20 },
      unit: { type: String, enum: ["b", "kb", "mb", "gb"], default: "mb" },
      stream: { type: Number, min: 0, default: 10 },
      stream_unit: { type: String, enum: ["b", "kb", "mb", "gb"], default: "gb" },
    },
    image: {
      download: { type: Number, min: 0, default: 512 },
      upload: { type: Number, min: 0, default: 512 },
      maxfileupload: { type: Number, min: 0, default: 20 },
      maxfileDownload: { type: Number, min: 0, default: 20 },
      unit: { type: String, enum: ["b", "kb", "mb", "gb"], default: "mb" },
      stream: { type: Number, min: 0, default: 10 },
      stream_unit: { type: String, enum: ["b", "kb", "mb", "gb"], default: "gb" },
    },
    video: {
      download: { type: Number, min: 0, default: 1024 },
      upload: { type: Number, min: 0, default: 1024 },
      maxfileupload: { type: Number, min: 0, default: 100 },
      maxfileDownload: { type: Number, min: 0, default: 100 },
      unit: { type: String, enum: ["b", "kb", "mb", "gb"], default: "mb" },
      stream: { type: Number, min: 0, default: 50 },
      stream_unit: { type: String, enum: ["b", "kb", "mb", "gb"], default: "gb" },
    },
    offer: {
      max: { type: Number, min: 0, default: 10 },
      regeneretetime: { type: String, enum: ["Daiyl", "montly"], default: "Daiyl" },
    },
    llm: {
      token: { type: Number, min: 0, default: 1024 },
      regeneretetime: { type: String, enum: ["Daiyl", "montly"], default: "Daiyl" },
    },
    token_limit: {
      token: { type: Number, min: 0, default: 512 },
      regeneretetime: { type: String, enum: ["Daiyl", "montly"], default: "Daiyl" },
    },
    maxDevices: { type: Number, },
  },
  duration: {
    unlimited: { type: Boolean, default: true },
    time: { type: Number, min: 1, default: 30 },
    interval: { type: String, enum: ['day', 'month', 'year'], default: "day" },
  },// Default: 30 day
  isRenewable: { type: Boolean, default: false },
  renewalPrice: { type: Number, default: null, min: 0 }, // If null, use original price
  discount: { type: Number, min: 0, max: 100, default: 0 }, // Percentage discount
  sales_channel: { type: String, enum: ["google"] }, // google apple ve huawei şeklinde artacak.
  product_id: { type: String, default: "" }, //ürün IDsi hangi satış kanalı ile satış yapılacaksa o satış kanalının paket için vereceği ürün id'si
  default_package: { type: Boolean, default: false },
  delete: { type: Boolean, default: false },
  status: { type: String, enum: ['active', 'inactive', 'archived'], default: 'active' },
}, { timestamps: true });

module.exports = packageSchema;