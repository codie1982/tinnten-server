//General Library
const asyncHandler = require("express-async-handler");
const { v4: uuidv4 } = require('uuid');

const User = require("../mongoModels/userModel.js");
const Company = require("../mongoModels/companyProfilModel")
const Phone = require("../mongoModels/phoneModel.js")
const Address = require("../mongoModels/addresModel.js")
const Social = require("../mongoModels/socilaLinksModel.js")
const SystemPackage = require("../mongoModels/systemPackageModel.js")
const Account = require("../mongoModels/accountModel.js")
const Image = require("../mongoModels/imagesModel.js")
//helper
const ApiResponse = require("../helpers/response.js")
const Keycloak = require("../lib/Keycloak.js");

/**
 * @desc Kullanıcının doğrulamasını yaparak yeni bir firma profili oluşturur.
 * @route POST /api/company/create
 * @access Private (Token gerekir)
 */
const createCompanyProfile = asyncHandler(async (req, res) => {
  const access_token = req?.kauth?.grant?.access_token?.token;
  if (!access_token) return res.status(401).json(ApiResponse.error({}, 401, "Erişim reddedildi."));

  let userkey = await Keycloak.getUserInfo(access_token);

  if (!userkey?.sub) return res.status(401).json(ApiResponse.error({}, 401, "Yetkilendirme başarısız."));

  const user = await User.findOne({ keyid: userkey.sub });
  if (!user) return res.status(404).json(ApiResponse.error({}, 404, "Kullanıcı bulunamadı."));
  const userid = user._id;

  const isExistUserCompany = await Company.findOne({ userid: userid })
  if (isExistUserCompany) return res.status(404).json(ApiResponse.error({}, 404, "Kullanıcının başka bir kayıtlı firması bulunmaktadır."));

  try {
    const {
      companyName,
      companySlug,
      foundedDate,
      description,
      logo,
      industry,
      website,
      email,
      certifications,
      companyType,
      taxOrIdentityNumber,
      packagename,
      phone = [],
      address = {},
      social = [],
      location
    } = req.body;

    // 🔍 VALIDASYONLAR
    if (!companyName || !industry) {
      return res.status(400).json(ApiResponse.error({}, 400, "Zorunlu alanlar eksik: companyName, industry"));
    }

    // 1. Slug benzersizlik kontrolü
    const existingCompanyWithSlug = await Company.findOne({ slug: companySlug });
    if (existingCompanyWithSlug) {
      return res.status(400).json(ApiResponse.error({}, 400, "Aynı slug'a sahip başka bir firma zaten mevcut."));
    }

    // 2. foundedDate geçmişte olmalı
    if (foundedDate && new Date(foundedDate) > new Date()) {
      return res.status(400).json(ApiResponse.error({}, 400, "Kuruluş tarihi gelecekte olamaz."));
    }

    // 3. description max 500 karakter
    if (description && description.length > 500) {
      return res.status(400).json(ApiResponse.error({}, 400, "Açıklama 500 karakterden uzun olamaz."));
    }

    // 4. website URL formatı
    const isValidUrl = (url) => {
      try {
        new URL(url);
        return true;
      } catch (err) {
        return false;
      }
    };
    if (website && !isValidUrl(website)) {
      return res.status(400).json(ApiResponse.error({}, 400, "Geçerli bir web sitesi URL'si girin."));
    }


    // 6. phone number doğruluğu
    const phoneRegex = /^\+?[0-9\s\-]{7,20}$/;
    for (const p of phone) {
      if (!phoneRegex.test(p.number)) {
        return res.status(400).json(ApiResponse.error({}, 400, `Geçersiz telefon numarası: ${p.number}`));
      }
    }

    // 7. industry array ve en az 1 madde içermeli
    if (!Array.isArray(industry) || industry.length === 0) {
      return res.status(400).json(ApiResponse.error({}, 400, "En az bir sektör (industry) seçilmelidir."));
    }

    // 8. companyType enum kontrolü
    if (!['individual', 'corporate'].includes(companyType)) {
      return res.status(400).json(ApiResponse.error({}, 400, "companyType değeri 'individual' veya 'corporate' olmalıdır."));
    }

    // 9. taxOrIdentityNumber benzersiz mi
    /*    const isTaxOrIdExists = await Company.findOne({ taxOrIdentityNumber });
       if (isTaxOrIdExists) {
         return res.status(400).json(ApiResponse.error({}, 400, "Bu vergi/T.C. numarası başka bir firmaya ait."));
       } */

    // 10. logo doğrulama
    if (!logo || typeof logo !== 'object' || !logo.uploadid) {
      return res.status(400).json(ApiResponse.error({}, 400, "Logo bilgisi eksik veya geçersiz. Lütfen önce resmi yükleyin."));
    }
    const logoDoc = await Image.findOne({ uploadid: logo.uploadid, userid });
    if (!logoDoc) {
      return res.status(400).json(ApiResponse.error({}, 400, "Logo bulunamadı veya geçersiz. Lütfen yeniden yükleyin."));
    }

    // 📦 Paket kontrolü
    const sPackage = await SystemPackage.findOne({
      name: packagename,
      forCompany: true,
      delete: false,
      status: "active",
    });
    if (!sPackage) {
      return res.status(400).json(ApiResponse.error({}, 400, "Paket bulunamadı."));
    }

    const nAccount = await new Account({
      userid,
      packages: [{ packageid: sPackage._id }]
    }).save();

    // 📞 Telefonları Kaydet
    const phoneIds = await Promise.all(phone.map(async (p) => {
      const phoneDoc = new Phone({ ...p, userid });
      await phoneDoc.save();
      return phoneDoc._id;
    }));

    // 📍 Adres Kaydet (tek adres ama array olarak saklanır)
    const addressDoc = new Address({
      ...address,
      userid,
      location: {
        coordinates: {
          lat: location?.lat,
          lng: location?.lng
        }
      }
    });
    await addressDoc.save();

    // 🔗 Sosyal Medya Kaydet
    const socialIds = await Promise.all(social.map(async (s) => {
      const socialDoc = new Social({ ...s, userid });
      await socialDoc.save();
      return socialDoc._id;
    }));

    // 🏢 Şirket Oluştur
    const newCompany = new Company({
      userid,
      companyName,
      slug: companySlug,
      foundedDate,
      description,
      logo: logoDoc._id,
      industry,
      website,
      email,
      companyType,
      taxOrIdentityNumber,
      phone: phoneIds,
      address: [addressDoc._id],
      social: socialIds,
      account: nAccount._id,
      employees: [{ userid }],
      certifications,
      products: [],
      services: [],
      documents: [],
      galleries: [],
      contents: []
    });

    await newCompany.save();

    // 🔐 Keycloak grup işlemleri
    const groupName = companyName + " - grp";
    await Keycloak.createGroup(groupName);
    await Keycloak.addUserToGroup(userkey.sub, groupName);

    return res.status(201).json({
      success: true,
      message: "Firma profili başarıyla oluşturuldu!",
      company: newCompany
    });

  } catch (error) {
    console.error("Firma profili oluştururken hata:", error);
    return res.status(500).json({
      success: false,
      message: "Firma profili oluşturulurken hata oluştu.",
      error: error.message
    });
  }
});
/**
 * @desc Giriş yapan kullanıcıya ait firma profilini getirir.
 * @route GET /api/company/me
 * @access Private (Token gerekir)
 */
const getCompanyProfile = asyncHandler(async (req, res) => {
  const access_token = req?.kauth?.grant?.access_token?.token;
  if (!access_token) {
    return res.status(401).json(ApiResponse.error({}, 401, "Erişim reddedildi."));
  }

  const userkey = await Keycloak.getUserInfo(access_token);
  if (!userkey?.sub) {
    return res.status(401).json(ApiResponse.error({}, 401, "Yetkilendirme başarısız."));
  }

  const user = await User.findOne({ keyid: userkey.sub });
  if (!user) {
    return res.status(404).json(ApiResponse.error({}, 404, "Kullanıcı bulunamadı."));
  }

  const company = await Company.findOne({ userid: user._id })
    .populate("logo")
    .populate("phone")
    .populate("address")
    .populate("social")
    .populate("accounts");

  if (!company) {
    return res.status(404).json(ApiResponse.error({}, 404, "Firma profili bulunamadı."));
  }

  return res.status(200).json({
    success: true,
    company
  });
});
/**
 * @desc Giriş yapan kullanıcıya ait firma profilini günceller.
 * @route UPDATE /api/company/me
 * @access Private (Token gerekir)
 */
const updateCompanyProfile = asyncHandler(async (req, res) => {
  const access_token = req?.kauth?.grant?.access_token?.token;
  if (!access_token) return res.status(401).json(ApiResponse.error({}, 401, "Erişim reddedildi."));

  const userkey = await Keycloak.getUserInfo(access_token);
  if (!userkey?.sub) return res.status(401).json(ApiResponse.error({}, 401, "Yetkilendirme başarısız."));

  const user = await User.findOne({ keyid: userkey.sub });
  if (!user) return res.status(404).json(ApiResponse.error({}, 404, "Kullanıcı bulunamadı."));

  const company = await Company.findOne({ userid: user._id });
  if (!company) return res.status(404).json(ApiResponse.error({}, 404, "Firma profili bulunamadı."));

  const { companyName, website } = req.body;
  const now = new Date();

  // 📌 Firma Adı Kontrolü
  if (companyName && companyName !== company.companyName) {
    const nameHistory = company.fieldHistory?.companyName || [];
    const yearChanges = nameHistory.filter(h => now.getFullYear() === new Date(h.updatedAt).getFullYear());

    if (nameHistory.length >= 3) {
      return res.status(400).json(ApiResponse.error({}, 400, "Firma adı en fazla 3 kez değiştirilebilir."));
    }

    if (yearChanges.length >= 1) {
      return res.status(400).json(ApiResponse.error({}, 400, "Firma adı yılda sadece 1 kez değiştirilebilir."));
    }

    // Güncelle ve geçmişe ekle
    company.fieldHistory.companyName.push({ value: company.companyName, updatedAt: now });
    company.companyName = companyName;
  }

  // 🌐 Web Sitesi Kontrolü
  if (website && website !== company.website) {
    const webHistory = company.fieldHistory?.website || [];
    const yearChanges = webHistory.filter(h => now.getFullYear() === new Date(h.updatedAt).getFullYear());
    const lastChange = webHistory.length ? new Date(webHistory[webHistory.length - 1].updatedAt) : null;
    const diff = lastChange ? now - lastChange : Infinity;
    const sixMonths = 1000 * 60 * 60 * 24 * 30 * 6;

    if (yearChanges.length >= 2) {
      return res.status(400).json(ApiResponse.error({}, 400, "Web sitesi yılda en fazla 2 kez değiştirilebilir."));
    }

    if (diff < sixMonths) {
      return res.status(400).json(ApiResponse.error({}, 400, "Web sitesini tekrar değiştirebilmek için 6 ay geçmelidir."));
    }

    company.fieldHistory.website.push({ value: company.website, updatedAt: now });
    company.website = website;
  }

  await company.save();
  return res.status(200).json({ success: true, message: "Firma başarıyla güncellendi.", company });
});
/**
 * @desc Yeni bir telefon numarası ekler (onaysız olarak).
 * @route POST /api/phone
 * @access Private (Token gerekir)
 */
const createPhone = asyncHandler(async (req, res) => {
  const access_token = req?.kauth?.grant?.access_token?.token;
  if (!access_token) {
    return res.status(401).json(ApiResponse.error({}, 401, "Erişim reddedildi."));
  }

  const userkey = await Keycloak.getUserInfo(access_token);
  if (!userkey?.sub) {
    return res.status(401).json(ApiResponse.error({}, 401, "Yetkilendirme başarısız."));
  }

  const user = await User.findOne({ keyid: userkey.sub });
  if (!user) {
    return res.status(404).json(ApiResponse.error({}, 404, "Kullanıcı bulunamadı."));
  }

  const { type, number } = req.body;

  // Temel validasyonlar
  const validTypes = ['mobile', 'home', 'work'];
  if (!validTypes.includes(type)) {
    return res.status(400).json(ApiResponse.error({}, 400, "Geçersiz telefon tipi."));
  }

  const phoneRegex = /^\+?[0-9\s\-]{7,20}$/;
  if (!phoneRegex.test(number)) {
    return res.status(400).json(ApiResponse.error({}, 400, "Geçersiz telefon numarası formatı."));
  }

  const phone = new Phone({
    userid: user._id,
    type,
    number,
    aprove: false // Otomatik olarak false
  });

  await phone.save();

  return res.status(201).json({
    success: true,
    message: "Telefon numarası başarıyla eklendi.",
    phone
  });
});
/**
 * @desc Belirli bir telefon numarasını günceller.
 * @route PUT /api/phone/:phoneId
 * @access Private (Token gerekir)
 */
const updatePhone = asyncHandler(async (req, res) => {
  const { phoneId } = req.params;
  const { type, number } = req.body;

  // Tip kontrolü (opsiyonel ama faydalı)
  const validTypes = ["mobile", "home", "work"];
  if (type && !validTypes.includes(type)) {
    return res.status(400).json(ApiResponse.error({}, 400, "Geçersiz telefon tipi."));
  }

  const phoneRegex = /^\+?[0-9\s\-]{7,20}$/;
  if (number && !phoneRegex.test(number)) {
    return res.status(400).json(ApiResponse.error({}, 400, "Geçersiz telefon numarası formatı."));
  }

  const phone = await Phone.findById(phoneId);
  if (!phone) {
    return res.status(404).json(ApiResponse.error({}, 404, "Telefon kaydı bulunamadı."));
  }

  // Kullanıcının yetkisi varsa kontrol burada eklenebilir (isteğe bağlı)
  if (type) phone.type = type;
  if (number) phone.number = number;

  await phone.save();

  return res.status(200).json({
    success: true,
    message: "Telefon kaydı başarıyla güncellendi.",
    phone
  });
});
/**
 * @desc Yeni bir adres kaydı oluşturur.
 * @route POST /api/address
 * @access Private (Token gerekir)
 */
const createAddress = asyncHandler(async (req, res) => {
  const access_token = req?.kauth?.grant?.access_token?.token;
  if (!access_token) {
    return res.status(401).json(ApiResponse.error({}, 401, "Erişim reddedildi."));
  }

  const userkey = await Keycloak.getUserInfo(access_token);
  if (!userkey?.sub) {
    return res.status(401).json(ApiResponse.error({}, 401, "Yetkilendirme başarısız."));
  }

  const user = await User.findOne({ keyid: userkey.sub });
  if (!user) {
    return res.status(404).json(ApiResponse.error({}, 404, "Kullanıcı bulunamadı."));
  }

  const {
    street,
    city,
    state,
    zip,
    country,
    location
  } = req.body;

  const address = new Address({
    userid: user._id,
    street,
    city,
    state,
    zip,
    country,
    location
  });

  await address.save();

  return res.status(201).json({
    success: true,
    message: "Adres başarıyla eklendi.",
    address
  });
});
/**
 * @desc Belirli bir adres kaydını günceller.
 * @route PUT /api/address/:addressId
 * @access Private (Token gerekir)
 */
const updateAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;
  const {
    street,
    city,
    state,
    zip,
    country,
    location
  } = req.body;

  const address = await Address.findById(addressId);
  if (!address) {
    return res.status(404).json(ApiResponse.error({}, 404, "Adres kaydı bulunamadı."));
  }

  // Gerekli alanları güncelle
  if (street !== undefined) address.street = street;
  if (city !== undefined) address.city = city;
  if (state !== undefined) address.state = state;
  if (zip !== undefined) address.zip = zip;
  if (country !== undefined) address.country = country;

  if (location?.coordinates) {
    address.location = {
      coordinates: {
        lat: location.coordinates.lat || address.location?.coordinates?.lat || 0,
        lng: location.coordinates.lng || address.location?.coordinates?.lng || 0
      }
    };
  }

  await address.save();

  return res.status(200).json({
    success: true,
    message: "Adres başarıyla güncellendi.",
    address
  });
});
/**
 * @desc Yeni bir sosyal medya bağlantısı ekler.
 * @route POST /api/social
 * @access Private (Token gerekir)
 */
const createSocial = asyncHandler(async (req, res) => {
  const access_token = req?.kauth?.grant?.access_token?.token;
  if (!access_token) {
    return res.status(401).json(ApiResponse.error({}, 401, "Erişim reddedildi."));
  }

  const userkey = await Keycloak.getUserInfo(access_token);
  if (!userkey?.sub) {
    return res.status(401).json(ApiResponse.error({}, 401, "Yetkilendirme başarısız."));
  }

  const user = await User.findOne({ keyid: userkey.sub });
  if (!user) {
    return res.status(404).json(ApiResponse.error({}, 404, "Kullanıcı bulunamadı."));
  }

  const { platform, link } = req.body;

  if (!platform || typeof platform !== "string") {
    return res.status(400).json(ApiResponse.error({}, 400, "Platform alanı zorunludur."));
  }

  if (link && typeof link !== "string") {
    return res.status(400).json(ApiResponse.error({}, 400, "Geçersiz bağlantı formatı."));
  }

  const social = new Social({
    userid: user._id,
    platform,
    link
  });

  await social.save();

  return res.status(201).json({
    success: true,
    message: "Sosyal medya bağlantısı başarıyla eklendi.",
    social
  });
});
/**
 * @desc Belirli bir sosyal medya bağlantısını günceller.
 * @route PUT /api/social/:socialId
 * @access Private (Token gerekir)
 */
const updateSocial = asyncHandler(async (req, res) => {
  const { socialId } = req.params;
  const { platform, link } = req.body;

  if (platform && typeof platform !== "string") {
    return res.status(400).json(ApiResponse.error({}, 400, "Geçersiz platform formatı."));
  }

  if (link && typeof link !== "string") {
    return res.status(400).json(ApiResponse.error({}, 400, "Geçersiz link formatı."));
  }

  const social = await Social.findById(socialId);
  if (!social) {
    return res.status(404).json(ApiResponse.error({}, 404, "Sosyal medya kaydı bulunamadı."));
  }

  if (platform !== undefined) social.platform = platform;
  if (link !== undefined) social.link = link;

  await social.save();

  return res.status(200).json({
    success: true,
    message: "Sosyal medya kaydı başarıyla güncellendi.",
    social
  });
});
/**
 * @desc Belirli bir firma profilini siler.
 * @route DELETE /api/company/:id
 * @access Private (Token gerekir - sadece sahibi veya admin)
 */
const deleteCompanyProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const company = await Company.findById(id);
  if (!company) {
    return res.status(404).json(ApiResponse.error({}, 404, "Firma profili bulunamadı."));
  }

  // Firma sahibinin kimliği doğrulanmalı (isteğe bağlı olarak)

  // Firma siliniyor
  await company.deleteOne();

  return res.status(200).json({
    success: true,
    message: "Firma profili başarıyla silindi."
  });
});
/**
 * @desc Belirli bir telefon kaydını siler.
 * @route DELETE /api/phone/:phoneId
 * @access Private (Token gerekir - sahibi)
 */
const deletePhone = asyncHandler(async (req, res) => {
  const { phoneId } = req.params;

  const phone = await Phone.findById(phoneId);
  if (!phone) {
    return res.status(404).json(ApiResponse.error({}, 404, "Telefon kaydı bulunamadı."));
  }

  await phone.deleteOne();

  return res.status(200).json({
    success: true,
    message: "Telefon numarası başarıyla silindi."
  });
});
/**
 * @desc Belirli bir adres kaydını siler.
 * @route DELETE /api/address/:addressId
 * @access Private (Token gerekir - sahibi)
 */
const deleteAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;

  const address = await Address.findById(addressId);
  if (!address) {
    return res.status(404).json(ApiResponse.error({}, 404, "Adres kaydı bulunamadı."));
  }

  await address.deleteOne();

  return res.status(200).json({
    success: true,
    message: "Adres başarıyla silindi."
  });
});
/**
 * @desc Belirli bir sosyal medya bağlantısını siler.
 * @route DELETE /api/social/:socialId
 * @access Private (Token gerekir - sahibi)
 */
const deleteSocial = asyncHandler(async (req, res) => {
  const { socialId } = req.params;

  const social = await Social.findById(socialId);
  if (!social) {
    return res.status(404).json(ApiResponse.error({}, 404, "Sosyal medya kaydı bulunamadı."));
  }

  await social.deleteOne();

  return res.status(200).json({
    success: true,
    message: "Sosyal medya bağlantısı başarıyla silindi."
  });
});
// **Firma özel isim alanı kontrol etme**
const checkCompanySlug = asyncHandler(async (req, res) => {
  const { slug } = req.body;
  // Zorunlu alanlar kontrolü
  if (!slug) {
    return res.status(400).json(ApiResponse.error({}, 400, "Firma ismi kullanılmaktadır."));
  }
  // Kullanıcıyı Keycloak'tan al
  const access_token = req?.kauth?.grant?.access_token?.token;
  if (!access_token) {
    return res.status(401).json(ApiResponse.error({}, 401, "Erişim reddedildi."));
  }

  const userkey = await Keycloak.getUserInfo(access_token);
  if (!userkey || !userkey.sub) {
    return res.status(401).json(ApiResponse.error({}, 401, "Yetkilendirme başarısız."));
  }

  try {
    const isExist = await Company.findOne({ slug: slug })
    if (isExist) {
      return res.status(400).json(ApiResponse.error({}, 400, "Firma ismi daha önce kullanılmıştır."));

    }
    return res.status(200).json({ success: true, message: "isim kullanılabilir." });
  } catch (error) {
    console.error("Firma profili oluştururken hata oluştu:", error);
    return res.status(500).json({ success: false, message: "isimlendirmede kritik hata.", error: error.message });
  }
});









module.exports = {
  createCompanyProfile, checkCompanySlug, updateCompanyProfile, getCompanyProfile, createPhone, updatePhone, createAddress, updateAddress, createSocial, updateSocial, deleteCompanyProfile, deletePhone, deleteSocial, deleteAddress
};
