//General Library
const asyncHandler = require("express-async-handler");
const axios = require("axios");
const { v4: uuidv4 } = require('uuid');

const User = require("../models/userModel.js");
const Profil = require("../models/userProfilModel.js")
const Phone = require("../models/phoneModel.js")
const Addres = require("../models/addresModel.js")
const Social = require("../models/socilaLinksModel.js")
const Package = require("../models/packageModel.js")
const Account = require("../models/accountModel.js")
//helper
const ApiResponse = require("../helpers/response.js")
const CONSTANT = require("../constant/users/constant.js")

const { publishToQueue } = require('../services/rabbitService.js');


const KEYCLOAK_BASE_URL = process.env.KEYCLOAK_BASE_URL; // Keycloak URL
const REALM = process.env.REALM; // Keycloak Realm adı
const CLIENT_ID = process.env.CLIENT_ID; // Keycloak Client ID
const CLIENT_SECRET = process.env.CLIENT_SECRET; // Client Secret (Confidential Clients için)



// **Kullanıcı Profili oluşturma**
const createCompanyProfile = asyncHandler(async (req, res) => {
  const access_token = req.kauth.grant.access_token.token;
  const {
    firstname,
    lastname,
    birthdate,
    bio,
    genre,
    profileImage,
    status,
    account,
    phoneNumbers,
    addresses,
    socialLinks,
  } = req.body;

  try {
    // **1️⃣ Geçerlilik Kontrolleri**
    if (!firstname || !lastname) {
      return res.status(400).json(ApiResponse.error({}, 400, "Lütfen tüm zorunlu alanları doldurun."));
    }


    // **4️⃣ MongoDB'de Profil Oluştur**
    const newProfile = new Profile({
      firstname,
      lastname,
      birthdate,
      bio,
      genre,
      profileImage,
      status,
      account,
      phoneNumbers,
      addresses,
      socialLinks
    });

    const savedProfile = await newProfile.save();
    if (savedProfile) {
      return res.status(201).json(ApiResponse.success(201, "Profil başarıyla oluşturuldu.", savedProfile));

    } else {
      return res.status(400).json(ApiResponse.error(400, "Kullanıcı oluşturulamadı", {}));
    }

  } catch (err) {
    console.error("Create Profile Error:", err.response ? err.response.data : err.message);
    return res.status(500).json(ApiResponse.error({}, 500, "Sunucu hatası: " + err.message));
  }
});










function isSingleWord(str) {
  return !str.includes(' ');
}
module.exports = {
  createCompanyProfile
};
