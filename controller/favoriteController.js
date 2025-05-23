const asyncHandler = require("express-async-handler");
const { v4: uuidv4 } = require('uuid');
const Favorite = require("../mongoModels/favoriteModel")
const ApiResponse = require("../helpers/response")
const { validateNamePath } = require("../helpers/validatename")
const PACKAGE_TYPE = {
  FREE: "free",
  MULTIPLE: "multiple",
  STUDENT: "student",
  MAXI: "maxi",
}
const getFavorites = asyncHandler(async (req, res) => {
  try {
    const packages = await Favorite.find({ delete: false, active: true }, (["-delete", "-active", "-google_channel", "-appel_channel"]))
    if (packages.length > 0) {
      const _packages = packages.map(pkg => {
        delete pkg.google_channel
        delete pkg.appel_channel
        return pkg
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
  getFavorites
};

