//General Library
const asyncHandler = require("express-async-handler");
const axios = require("axios");
const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs");
var geoip = require('geoip-lite');
const { v4: uuidv4 } = require('uuid');
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/userModel.js");
const Profil = require("../models/userProfilModel.js")
//helper
const ApiResponse = require("../helpers/response.js")



// **Kullanıcı Profili oluşturma**
const createProfile = asyncHandler(async (req, res) => {
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

// **Tüm Profilleri Getirme**
const getAllProfiles = asyncHandler(async (req, res) => {
  try {
    const profiles = await Profile.find();
    return res.status(200).json(ApiResponse.success(200, "Profiller başarıyla getirildi.", profiles));
  } catch (err) {
    console.error("Get All Profiles Error:", err);
    return res.status(500).json(ApiResponse.error({}, 500, "Sunucu hatası: " + err.message));
  }
});

// **Tek Profil Getirme (ID ile)**
const getProfileById = asyncHandler(async (req, res) => {
  try {
    const profile = await Profile.findById(req.params.id);
    if (!profile) {
      return res.status(404).json(ApiResponse.error({}, 404, "Profil bulunamadı."));
    }
    return res.status(200).json(ApiResponse.success(200, "Profil başarıyla getirildi.", profile));
  } catch (err) {
    console.error("Get Profile By ID Error:", err);
    return res.status(500).json(ApiResponse.error({}, 500, "Sunucu hatası: " + err.message));
  }
});

// **Profil Güncelleme (ID ile)**
const updateProfile = asyncHandler(async (req, res) => {
  try {
    const updatedProfile = await Profile.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedProfile) {
      return res.status(404).json(ApiResponse.error({}, 404, "Profil bulunamadı."));
    }
    return res.status(200).json(ApiResponse.success(200, "Profil başarıyla güncellendi.", updatedProfile));
  } catch (err) {
    console.error("Update Profile Error:", err);
    return res.status(500).json(ApiResponse.error({}, 500, "Sunucu hatası: " + err.message));
  }
});
// **Telefon Numaralarını Güncelleme**
const updatePhoneNumbers = asyncHandler(async (req, res) => {
  try {
    const { phoneNumbers } = req.body;
    if (!Array.isArray(phoneNumbers)) {
      return res.status(400).json(ApiResponse.error({}, 400, "Telefon numaraları dizi formatında olmalıdır."));
    }

    const updatedProfile = await Profile.findByIdAndUpdate(
      req.params.id,
      { $set: { phoneNumbers } },
      { new: true }
    );

    if (!updatedProfile) {
      return res.status(404).json(ApiResponse.error({}, 404, "Profil bulunamadı."));
    }

    return res.status(200).json(ApiResponse.success(200, "Telefon numaraları başarıyla güncellendi.", updatedProfile));
  } catch (err) {
    console.error("Update Phone Numbers Error:", err);
    return res.status(500).json(ApiResponse.error({}, 500, "Sunucu hatası: " + err.message));
  }
});
// **Adresleri Güncelleme**
const updateAddresses = asyncHandler(async (req, res) => {
  try {
    const { addresses } = req.body;
    if (!Array.isArray(addresses)) {
      return res.status(400).json(ApiResponse.error({}, 400, "Adresler dizi formatında olmalıdır."));
    }

    const updatedProfile = await Profile.findByIdAndUpdate(
      req.params.id,
      { $set: { addresses } },
      { new: true }
    );

    if (!updatedProfile) {
      return res.status(404).json(ApiResponse.error({}, 404, "Profil bulunamadı."));
    }

    return res.status(200).json(ApiResponse.success(200, "Adresler başarıyla güncellendi.", updatedProfile));
  } catch (err) {
    console.error("Update Addresses Error:", err);
    return res.status(500).json(ApiResponse.error({}, 500, "Sunucu hatası: " + err.message));
  }
});

// **Sosyal Linkleri Güncelleme**
const updateSocialLinks = asyncHandler(async (req, res) => {
  try {
    const { socialLinks } = req.body;
    if (typeof socialLinks !== 'object' || Array.isArray(socialLinks)) {
      return res.status(400).json(ApiResponse.error({}, 400, "Sosyal linkler geçerli bir nesne olmalıdır."));
    }

    const updatedProfile = await Profile.findByIdAndUpdate(
      req.params.id,
      { $set: { socialLinks } },
      { new: true }
    );

    if (!updatedProfile) {
      return res.status(404).json(ApiResponse.error({}, 404, "Profil bulunamadı."));
    }

    return res.status(200).json(ApiResponse.success(200, "Sosyal linkler başarıyla güncellendi.", updatedProfile));
  } catch (err) {
    console.error("Update Social Links Error:", err);
    return res.status(500).json(ApiResponse.error({}, 500, "Sunucu hatası: " + err.message));
  }
});

// **Profil Silme (ID ile)**
const deleteProfile = asyncHandler(async (req, res) => {
  try {
    const deletedProfile = await Profile.findByIdAndDelete(req.params.id);
    if (!deletedProfile) {
      return res.status(404).json(ApiResponse.error({}, 404, "Profil bulunamadı."));
    }
    return res.status(200).json(ApiResponse.success(200, "Profil başarıyla silindi.", deletedProfile));
  } catch (err) {
    console.error("Delete Profile Error:", err);
    return res.status(500).json(ApiResponse.error({}, 500, "Sunucu hatası: " + err.message));
  }
});

module.exports = {
  createProfile,
  getAllProfiles,
  getProfileById,
  updateProfile,
  updatePhoneNumbers,
  updateAddresses,
  updateSocialLinks,
  deleteProfile
};
