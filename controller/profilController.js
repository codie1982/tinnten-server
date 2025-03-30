//General Library
const asyncHandler = require("express-async-handler");
const axios = require("axios");
const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs");
var geoip = require('geoip-lite');
const { v4: uuidv4 } = require('uuid');
const { OAuth2Client } = require("google-auth-library");
const User = require("../mongoModels/userModel.js");
const Profile = require("../mongoModels/userProfilModel.js")
const Phone = require("../mongoModels/phoneModel.js")
const Address = require("../mongoModels/addresModel.js")
const Social = require("../mongoModels/socilaLinksModel.js")
const Images = require("../mongoModels/imagesModel.js")


//helper
const ApiResponse = require("../helpers/response.js");
const Keycloak = require("../lib/Keycloak.js");
const { getUserProfile } = require("../services/profileServices.js");


// **Kullanıcı Profili oluşturma**
const createProfile = asyncHandler(async (req, res) => {
  const access_token = req.kauth.grant.access_token.token;


  const {
    firstname,
    lastname,
    birthdate,
    bio,
    gender,
    profileImage,
    status,
  } = req.body;

  try {
    // **1️⃣ Geçerlilik Kontrolleri**
    if (!firstname || !lastname) {
      return res.status(400).json(ApiResponse.error(400, "Lütfen tüm zorunlu alanları doldurun."), {});
    }
    try {
      const userinfo = await Keycloak.getUserInfo(access_token)
    } catch (error) {
      return res.status(400).json(ApiResponse.error(400, "Kullanıcı bilgileri alınamadı."), {});
    }

    const _user = await User.findOne({ keyid: userinfo.data.sub })
    // **4️⃣ MongoDB'de Profil Oluştur**
    const newProfile = new Profile({
      userid: _user._id,
      firstname,
      lastname,
      birthdate,
      bio,
      gender,
      profileImage,
      status,
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
const getProfile = asyncHandler(async (req, res) => {
   // **1️⃣ Kullanıcı Keycloak'tan JWT Token al**
    const access_token = req.kauth.grant.access_token.token;
 
     // **2️⃣ Kullanıcının ID’sini Keycloak üzerinden al**
     const userInfo = await Keycloak.getUserInfo(access_token);
 
     const userkeyid = userInfo.sub;
     let user = await User.findOne({ keyid: userkeyid });
     if (!user) {
         user = await new User({ keyid: userkeyid }).save();
     }
     const userid = user._id;
  try {

    const profiles = await getUserProfile(userid)
    console.log("profiles", profiles) 
    return res.status(200).json(ApiResponse.success(200, "Profiller başarıyla getirildi.", profiles));
  } catch (err) {
    console.error("Get All Profiles Error:", err);
    return res.status(500).json(ApiResponse.error({}, 500, "Sunucu hatası: " + err.message));
  }
});



// **Profil Güncelleme (ID ile)**
const updateProfile = asyncHandler(async (req, res) => {
  try {
    // Kullanıcıyı Keycloak'tan al
    const access_token = req.kauth.grant.access_token.token;
    const userkey = await Keycloak.getUserInfo(access_token);
    const user = await User.findOne({ keyid: userkey.sub });

    if (!user) {
      return res.status(404).json(ApiResponse.error({}, 404, "Kullanıcı bulunamadı."));
    }

    /**
     * bio : ""
       birthdate         :         "2025-03-28T00:00:00.000Z"
      firstname        :         "Engin"
      gender        : 
        "man"
        lastname
        : 
        "EROL"
        uploadid
        : 
        ""
     */
    // Güncellenmesine izin verilen alanları al

    const allowedFields = ["firstname", "lastname", "birthdate", "bio", "gender", "profileImage"];
    const updates = {};


    // `req.body` içinde yalnızca izin verilen alanları filtrele
    Object.keys(req.body).forEach((key) => {
      if (allowedFields.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    console.log("updates", updates)

    // Profil Güncelleme
    const updatedProfile = await Profile.findOneAndUpdate(
      { userid: user._id }, // `findOneAndUpdate` kullan
      { $set: updates }, // Filtrelenmiş güncellemeleri uygula
      { new: true }
    );

    if (!updatedProfile) {
      return res.status(404).json(ApiResponse.error({}, 404, "Profil bulunamadı."));
    }
    const userProfile = await getUserProfile(user._id);
    console.log("userProfile", userProfile)
    return res.status(200).json(ApiResponse.success(200, "Profil başarıyla güncellendi.", userProfile));
  } catch (err) {
    console.error("Update Profile Error:", err);
    return res.status(500).json(ApiResponse.error({}, 500, "Sunucu hatası: " + err.message));
  }
});
// **Telefon Numaralarını Güncelleme**
const updatePhoneNumbers = asyncHandler(async (req, res) => {
  try {
    const access_token = req.kauth.grant.access_token.token;
    const userkey = await Keycloak.getUserInfo(access_token);
    const user = await User.findOne({ keyid: userkey.sub });

    if (!user) {
      return res.status(404).json(ApiResponse.error({}, 404, "Kullanıcı bulunamadı."));
    }

    const { phones } = req.body;
    if (!Array.isArray(phones)) {
      return res.status(400).json(ApiResponse.error({}, 400, "Telefon bilgileri dizi formatında olmalıdır."));
    }

    let newPhoneIds = [];
    let updatedPhoneIds = [];

    for (const phone of phones) {
      if (phone._id) {
        // Eğer _id varsa, var olan telefon numarasını güncelle
        await Phone.findByIdAndUpdate(phone._id, { type: phone.type, number: phone.number });
        updatedPhoneIds.push(phone._id);
      } else {
        // Eğer _id yoksa, aynı numara var mı kontrol et
        const existingPhones = await Phone.find({ userid: user._id });
        const phoneExists = existingPhones.find(item => item.number === phone.number);

        if (!phoneExists) {
          // Eğer numara zaten kayıtlı değilse, yeni bir telefon kaydı oluştur
          const newPhone = new Phone({
            userid: user._id,
            type: phone.type,
            number: phone.number
          });
          await newPhone.save();
          newPhoneIds.push(newPhone._id);
        } else {
          // Zaten varsa, mevcut ID'yi al
          updatedPhoneIds.push(phoneExists._id);
        }
      }
    }

    // Kullanıcının mevcut profilini çek
    const userProfile = await Profile.findOne({ userid: user._id });

    // Eğer `userProfile` yoksa, boş bir dizi olarak tanımla
    const existingProfilePhones = userProfile?.phones?.map(id => id.toString()) || [];

    // Profilde eksik olan telefon numaralarını tespit et ve ekle
    const missingPhones = updatedPhoneIds.filter(id => !existingProfilePhones.includes(id.toString()));

    if (missingPhones.length > 0) {
      await Profile.findOneAndUpdate(
        { userid: user._id },
        { $push: { phones: { $each: missingPhones } } },
        { new: true }
      );
    }

    // Yeni eklenen telefonları Profile'a ekleyelim (sadece yeni olanları)
    if (newPhoneIds.length > 0) {
      await Profile.findOneAndUpdate(
        { userid: user._id },
        { $push: { phones: { $each: newPhoneIds } } },
        { new: true }
      );
    }

    return res.status(200).json(ApiResponse.success(200, "Telefon numaraları başarıyla güncellendi veya eklendi."));
  } catch (err) {
    console.error("Update Phone Numbers Error:", err);
    return res.status(500).json(ApiResponse.error({}, 500, "Sunucu hatası: " + err.message));
  }
});
// **Adresleri Güncelleme**
const updateAddresses = asyncHandler(async (req, res) => {
  try {
    const access_token = req.kauth.grant.access_token.token;
    const userkey = await Keycloak.getUserInfo(access_token);
    const user = await User.findOne({ keyid: userkey.sub });

    if (!user) {
      return res.status(404).json(ApiResponse.error({}, 404, "Kullanıcı bulunamadı."));
    }

    const { addresses } = req.body;
    if (!Array.isArray(addresses)) {
      return res.status(400).json(ApiResponse.error({}, 400, "Adresler dizi formatında olmalıdır."));
    }

    let newAddressIds = [];
    let updatedAddressIds = [];

    for (const address of addresses) {
      if (address._id) {
        // Eğer _id varsa, var olan adresi güncelle
        await Address.findByIdAndUpdate(address._id, {
          street: address.street,
          city: address.city,
          state: address.state,
          zip: address.zip,
          country: address.country
        });
        updatedAddressIds.push(address._id);
      } else {
        // Eğer _id yoksa, aynı adres var mı kontrol et
        const existingAddresses = await Address.find({ userid: user._id });
        const addressExists = existingAddresses.find(item =>
          item.street === address.street &&
          item.city === address.city &&
          item.state === address.state &&
          item.zip === address.zip &&
          item.country === address.country
        );

        if (!addressExists) {
          // Eğer adres zaten kayıtlı değilse, yeni bir adres oluştur
          const newAddress = new Address({
            userid: user._id,
            street: address.street,
            city: address.city,
            state: address.state,
            zip: address.zip,
            country: address.country
          });
          await newAddress.save();
          newAddressIds.push(newAddress._id);
        } else {
          // Zaten varsa, mevcut ID'yi al
          updatedAddressIds.push(addressExists._id);
        }
      }
    }

    // Kullanıcının mevcut profilini çek
    const userProfile = await Profile.findOne({ userid: user._id });

    // Eğer `userProfile` yoksa, boş bir dizi olarak tanımla
    const existingProfileAddresses = userProfile?.addresses?.map(id => id.toString()) || [];

    // Profilde eksik olan adresleri tespit et ve ekle
    const missingAddresses = updatedAddressIds.filter(id => !existingProfileAddresses.includes(id.toString()));

    if (missingAddresses.length > 0) {
      await Profile.findOneAndUpdate(
        { userid: user._id },
        { $push: { addresses: { $each: missingAddresses } } },
        { new: true }
      );
    }

    // Yeni eklenen adresleri Profile'a ekleyelim (sadece yeni olanları)
    if (newAddressIds.length > 0) {
      await Profile.findOneAndUpdate(
        { userid: user._id },
        { $push: { addresses: { $each: newAddressIds } } },
        { new: true }
      );
    }

    return res.status(200).json(ApiResponse.success(200, "Adresler başarıyla güncellendi veya eklendi."));
  } catch (err) {
    console.error("Update Addresses Error:", err);
    return res.status(500).json(ApiResponse.error({}, 500, "Sunucu hatası: " + err.message));
  }
});

// **Sosyal Linkleri Güncelleme**
const updateSocialLinks = asyncHandler(async (req, res) => {
  try {
    const access_token = req.kauth.grant.access_token.token;
    const userkey = await Keycloak.getUserInfo(access_token);
    const user = await User.findOne({ keyid: userkey.sub });

    if (!user) {
      return res.status(404).json(ApiResponse.error({}, 404, "Kullanıcı bulunamadı."));
    }

    const { sociallinks } = req.body;
    if (!Array.isArray(sociallinks)) {
      return res.status(400).json(ApiResponse.error({}, 400, "Sosyal linkler dizi formatında olmalıdır."));
    }

    let newSocialLinkIds = [];
    let updatedSocialLinkIds = [];

    for (const link of sociallinks) {
      if (link._id) {
        // Eğer _id varsa, var olan sosyal bağlantıyı güncelle
        await Social.findByIdAndUpdate(link._id, { link: link.link });
        updatedSocialLinkIds.push(link._id);
      } else {
        // Eğer _id yoksa, aynı link var mı kontrol et
        const existingSocialLinks = await Social.find({ userid: user._id });
        const socialExists = existingSocialLinks.find((item) => item.link === link.link);

        if (!socialExists) {
          // Eğer link zaten kayıtlı değilse, yeni bir sosyal bağlantı oluştur
          const newSocialLink = new Social({
            userid: user._id,
            link: link.link
          });
          await newSocialLink.save();
          newSocialLinkIds.push(newSocialLink._id);
        } else {
          // Zaten varsa, mevcut ID'yi al
          updatedSocialLinkIds.push(socialExists._id);
        }
      }
    }

    // Kullanıcının mevcut profilini çek
    const userProfile = await Profile.findOne({ userid: user._id });

    // Eğer userProfile null ise, boş bir dizi olarak tanımla
    const existingProfileLinks = userProfile?.sociallinks?.map(id => id.toString()) || [];

    // Profilde eksik olanları tespit et ve ekle
    const missingLinks = updatedSocialLinkIds.filter(id => !existingProfileLinks.includes(id.toString()));

    if (missingLinks.length > 0) {
      await Profile.findOneAndUpdate(
        { userid: user._id },
        { $push: { sociallinks: { $each: missingLinks } } },
        { new: true }
      );
    }

    return res.status(200).json(ApiResponse.success(200, "Sosyal linkler başarıyla güncellendi veya eklendi."));
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
  getProfile,
  updateProfile,
  updatePhoneNumbers,
  updateAddresses,
  updateSocialLinks,
  deleteProfile
};
