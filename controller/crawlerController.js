//General Library
const asyncHandler = require("express-async-handler");
const axios = require("axios");
var geoip = require('geoip-lite');
const User = require("../mongoModels/userModel.js");
const Images = require("../mongoModels/imagesModel.js")
const Profile = require("../mongoModels/userProfilModel.js")
const Phone = require("../mongoModels/phoneModel.js")
const Address = require("../mongoModels/addresModel.js")
const Social = require("../mongoModels/socilaLinksModel.js")
const SystemPackage = require("../mongoModels/systemPackageModel.js")
const Account = require("../mongoModels/accountModel.js")
const { v4: uuidv4 } = require('uuid');
const { OAuth2Client } = require("google-auth-library");
//helper
const ApiResponse = require("../helpers/response.js");
const Keycloak = require("../lib/Keycloak.js");
const lwcJson = require("../assets/extracted_products_lcw.json")



const lcwRead = asyncHandler(async (req, res) => {

  const crawlerJson = lwcJson
  const firstData = crawlerJson[0]

  try {
    return res.status(200).json({
      status: { code: 200, description: "Success" },
      message: "data okundu",
      data: firstData
    });
  } catch (err) {
    console.error("❌ Register Error:", err.message);
    return res.status(500).json({ error: "Bir hata oluştu: " + err.message });
  }
});



module.exports = {
  lcwRead
};
