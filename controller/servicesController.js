const asyncHandler = require("express-async-handler");
const { v4: uuidv4 } = require('uuid');
const Services = require("../models/servicesModel")
const ApiResponse = require("../helpers/response")
const { validateNamePath } = require("../helpers/validatename")


const getServices = asyncHandler(async (req, res) => {
  try {
    const packages = await Services.find({ delete: false, active: true }, (["-delete", "-active", "-google_channel", "-appel_channel"]))
    if (packages.length > 0) {
      const _packages = packages.map(package => {
        delete package.google_channel
        delete package.appel_channel
        return package
      })
      return res.status(200).json(ApiResponse.success(200, 'Uygun paket listesi.', _packages));
    } else {
      return res.status(200).json(ApiResponse.error(404, 'herhangi bir paket tanımlı değil.', {}));
    }
  } catch (error) {
    console.error('Genel Hata:', err);
    return res.status(500).json(ApiResponse.error(500, 'Sunucu hatası.', { error: err.message }));
  }
});





module.exports = {
  getServices
};

