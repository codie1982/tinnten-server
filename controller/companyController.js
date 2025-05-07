//General Library
const asyncHandler = require("express-async-handler");
const axios = require("axios");
const { v4: uuidv4 } = require('uuid');

const User = require("../mongoModels/userModel.js");
const Company = require("../mongoModels/companyProfilModel.js")
const Phone = require("../mongoModels/phoneModel.js")
const Address = require("../mongoModels/addresModel.js")
const Social = require("../mongoModels/socilaLinksModel.js")
const SystemPackage = require("../mongoModels/systemPackageModel.js")
const Account = require("../mongoModels/accountModel.js")
//helper
const ApiResponse = require("../helpers/response.js")
const Keycloak = require("../lib/Keycloak.js");

// **Kullanıcı Profili oluşturma**
const createCompanyProfile = asyncHandler(async (req, res) => {
  // Kullanıcıyı Keycloak'tan al
  const access_token = req?.kauth?.grant?.access_token?.token;
  if (!access_token) {
    return res.status(401).json(ApiResponse.error({}, 401, "Erişim reddedildi."));
  }

  const userkey = await Keycloak.getUserInfo(access_token);
  if (!userkey || !userkey.sub) {
    return res.status(401).json(ApiResponse.error({}, 401, "Yetkilendirme başarısız."));
  }

  const user = await User.findOne({ keyid: userkey.sub });
  if (!user) {
    return res.status(404).json(ApiResponse.error({}, 404, "Kullanıcı bulunamadı."));
  }
  const userid = user._id;
  try {
    const {
      companyName,
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
      address = [],
      social = []
    } = req.body;
    // Zorunlu alanlar kontrolü
    if (!companyName || !industry || !email) {
      return res.status(400).json(ApiResponse.error({}, 400, "Zorunlu alanlar eksik: companyName, industry, email"));
    }

    // **6️⃣ Kullanıcıya Varsayılan Paket ve Bilgileri Ata**
    const sPackage = await SystemPackage.findOne({
      name: packagename,
      forCompany: true,
      default_package: true,
      delete: false,
      status: "active",
    });
    if (!sPackage) {
      return res.status(400).json(ApiResponse.error({}, 400, "Paket bulunamadı."));
    }

    // **Hesapları Kaydetme**
    const nAccount = await new Account({ userid, packages: [{ packageid: sPackage._id }] }).save()

    // **Yeni Firma Profili Kaydetme**
    const newCompany = new Company({
      userid,
      companyName,
      foundedDate,
      description,
      logo,
      industry,
      website,
      email,
      companyType, taxOrIdentityNumber,
      phone: [],
      address: [],
      social: [],
      accounts: [nAccount._id],
      employees: [{ userid }],
      certifications,
      products: [],
      services: [],
      documents: [],
      galleries: [],
      contents: []
    });

    await newCompany.save();

    let groupName = companyName + " - " + "grp"
    await Keycloak.createGroup(groupName)
    await Keycloak.addUserToGroup(userkey.sub, groupName)

    return res.status(201).json({ success: true, message: "Firma profili başarıyla oluşturuldu!", company: newCompany });
  } catch (error) {
    console.error("Firma profili oluştururken hata oluştu:", error);
    return res.status(500).json({ success: false, message: "Firma profili oluşturulurken hata oluştu.", error: error.message });
  }
});









module.exports = {
  createCompanyProfile
};
