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

const SCOPE = "https://www.googleapis.com/auth/userinfo.profile email openid"
const redirecServertUrl = "http://127.0.0.1:5001"
const redirecUrl = "http://127.0.0.1:3000"
const allow_origin_url = "http://localhost:3000"


const register = asyncHandler(async (req, res) => {
  const { email, device, provider, password, firstName, lastName } = req.body;

  try {
    // **1️⃣ İstemci ve Rol Bilgilerini Paralel Al**
    const [clientId, role] = await Promise.all([
      Keycloak.getClientId("tinnten-client"),
      Keycloak.getRole(await Keycloak.getClientId("tinnten-client"), "user"),
    ]);

    // **2️⃣ Keycloak Üzerinde Kullanıcı Oluştur**
    await Keycloak.createUser(email, password, firstName, lastName, { device, provider }, false);

    // **3️⃣ Kullanıcı ID’sini Al**
    const userId = await Keycloak.getUserId(email);

    // **4️⃣ Kullanıcıya Rol Ata**
    await Keycloak.assignRoleToUser(userId, clientId, role);

    // **5️⃣ Kullanıcıyı MongoDB’ye Kaydet**
    let userDoc = new User({ keyid: userId });
    let nUser = await userDoc.save();

    if (!nUser) return res.status(400).json({ error: "Kullanıcı oluşturulamadı." });

    let userid = nUser._id;
    console.log("📌 Kullanıcı DB ID:", userid);

    // **6️⃣ Kullanıcıya Varsayılan Paket ve Bilgileri Ata**
    const sPackage = await SystemPackage.findOne({
      forCompany: false,
      default_package: true,
      delete: false,
      status: "active",
    });
    console.log("sPackage", sPackage)

    const [nAccount, nPhone, nAddress, nSocial, nImages] = await Promise.all([
      new Account({ userid, packages: [{ packageid: sPackage._id }] }).save(),
      // new Phone({ userid }).save(),
      // new Address({ userid }).save(),
      // new Social({ userid }).save(),
      // new Images({ userid }).save()
    ]);
    console.log("nAccount", nAccount)

    let nProfile = await new Profile({
      userid,
      profileImage: {},
      accounts: [],
      phones: [],
      address: [],
      sociallinks: [],
    }).save();
    console.log("nProfile", nProfile)

    // **7️⃣ Kullanıcı Otomatik Giriş Yapsın**
    const tokenData = await Keycloak.getUserToken(email, password);

    return res.status(201).json({
      status: { code: 200, description: "Success" },
      message: "Oturum açıldı",
      data: {
        message: "Başarıyla giriş yapıldı",
        user: {
          sub: userId,
          email,
          given_name: firstName,
          family_name: lastName,
        },
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
      },
    });
  } catch (err) {
    console.error("❌ Register Error:", err.message);
    return res.status(500).json({ error: "Bir hata oluştu: " + err.message });
  }
});

const createurl = asyncHandler(async (req, res) => {
  try {
    const oAuth2Client = new OAuth2Client(
      process.env.CLIENT_ID,
      process.env.CLIENT_SECRET,
      redirecServertUrl
    );
    const url = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPE,
      prompt: "consent",
    });
    if (url) {
      return res.status(200).json(ApiResponse.success(200, "created google url", {
        url: url
      }));
    } else {
      res.status(401).json({ error: 'no google url' });

    }

  } catch (error) {
    res.status(401).json({ error: 'no google url' });
  }
});
const google = asyncHandler(async (req, res) => {
  const { email, device, provider, password, firstName, lastName } = req.body;

  try {
    // **1️⃣ İstemci ve Rol Bilgilerini Paralel Al**
    const [clientId, role] = await Promise.all([
      Keycloak.getClientId("tinnten-client"),
      Keycloak.getRole(await Keycloak.getClientId("tinnten-client"), "user"),
    ]);

    // **2️⃣ Keycloak Üzerinde Kullanıcı Oluştur**
    await Keycloak.createUser(email, password, firstName, lastName, { device, provider }, false);

    // **3️⃣ Kullanıcı ID’sini Al**
    const userId = await Keycloak.getUserId(email);

    // **4️⃣ Kullanıcıya Rol Ata**
    await Keycloak.assignRoleToUser(userId, clientId, role);

    // **5️⃣ Kullanıcıyı MongoDB’ye Kaydet**
    let userDoc = new User({ keyid: userId });
    let nUser = await userDoc.save();

    if (!nUser) return res.status(400).json({ error: "Kullanıcı oluşturulamadı." });

    let userid = nUser._id;
    console.log("📌 Kullanıcı DB ID:", userid);

    // **6️⃣ Kullanıcıya Varsayılan Paket ve Bilgileri Ata**
    const sPackage = await SystemPackage.findOne({
      forCompany: false,
      default_package: true,
      delete: false,
      status: "active",
    });
    console.log("sPackage", sPackage)

    const [nAccount, nPhone, nAddress, nSocial, nImages] = await Promise.all([
      new Account({ userid, packages: [{ packageid: sPackage._id }] }).save(),
      // new Phone({ userid }).save(),
      // new Address({ userid }).save(),
      // new Social({ userid }).save(),
      // new Images({ userid }).save()
    ]);
    console.log("nAccount", nAccount)

    let nProfile = await new Profile({
      userid,
      profileImage: {},
      accounts: [],
      phones: [],
      address: [],
      sociallinks: [],
    }).save();
    console.log("nProfile", nProfile)

    // **7️⃣ Kullanıcı Otomatik Giriş Yapsın**
    const tokenData = await Keycloak.getUserToken(email, password);

    return res.status(201).json({
      status: { code: 200, description: "Success" },
      message: "Oturum açıldı",
      data: {
        message: "Başarıyla giriş yapıldı",
        user: {
          sub: userId,
          email,
          given_name: firstName,
          family_name: lastName,
        },
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
      },
    });
  } catch (err) {
    console.error("❌ Register Error:", err.message);
    return res.status(500).json({ error: "Bir hata oluştu: " + err.message });
  }
});
/*
      try {
        await publishToQueue('email_queue', {
          type: 'email',
          data: {
            to: email,
            subject: 'Kayıt Başarılı!',
            message: `Kayıt işleminiz başarıyla tamamlandı!`
          }
        });
      } catch (error) {
        console.log("emailResponse error", error.response ? error.response.data : error.message);
      }
      */
// **Kullanıcı Profili oluşturma**

//access public
const login = asyncHandler(async (req, res) => {
  const { email, password, device, deviceid } = req.body;
  const userAgent = req.headers["user-agent"];
  const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
  const geo = geoip.lookup(ip);

  if (!device) {
    return res.status(400).json(ApiResponse.error(400, "Cihaz bilgisi eksik", { message: "Cihaz türü belirtilmeli (web, mobile, tv)." }));
  }

  try {
    // **1️⃣ Kullanıcı Keycloak'tan JWT Token al**
    const tokenData = await Keycloak.getUserToken(email, password);
    const { access_token, refresh_token } = tokenData;

    // ✅ Refresh Token'ı Cookie'ye yaz
    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
      path: '/',
    });

    // **2️⃣ Kullanıcının ID’sini Keycloak üzerinden al**
    const userInfo = await Keycloak.getUserInfo(access_token);
    const userkeyid = userInfo.sub;
    let user = await User.findOne({ keyid: userkeyid })
    if (!user) {
      user = await new User({ keyid: userkeyid }).save();
    }
    const userid = user._id
    const profiles = await Profile.findOne({ userid })
      .populate("profileImage")
      .populate({
        path: "accounts",
        populate: {
          path: "packages.packageid", // DİKKAT: "packages" içindeki "packageid" populate edilecek
          model: "system-packages", // Eğer otomatik algılanmazsa modeli burada belirtmelisin
          select: ["name", "title", "description", "category", "price", "duration", "discount", "isRenewable"]
        }
      })
      .populate("phones")
      .populate("address")
      .populate("sociallinks");

    // **3️⃣ Kullanıcının aktif oturumlarını al**
    const activeSessions = await Keycloak.getUserSessions(userkeyid);

    let isSameDevice = false;
    let isNewDevice = true;
    let sameSession;

    activeSessions.forEach((session) => {
      if (session.ipAddress === ip && session.userAgent === userAgent) {
        isSameDevice = true;
        sameSession = session;
      }
      if (session.deviceInfo?.deviceid === deviceid) {
        isNewDevice = false;
      }
    });

    if (isSameDevice) {
      return res.status(400).json(ApiResponse.error(400, "Bu cihaz zaten oturum açık", {
        message: "Bu cihazda zaten aktif bir oturumunuz var."
      }));
    }

    // **4️⃣ Kullanıcının maksimum oturum sayısını kontrol et**
    const MAX_SESSIONS = 3;
    if (activeSessions.length > MAX_SESSIONS) {
      await Keycloak.terminateOldSessions(userkeyid, activeSessions, MAX_SESSIONS);
    }

    // **5️⃣ Kullanıcı yeni bir cihazdan giriş yaptıysa e-posta bildirimi gönder**
    if (isNewDevice) {
      await Keycloak.sendDeviceChangeEmail(email, userInfo.name, new Date(), device, userAgent, ip);
    }

    delete userInfo.sub
    // **6️⃣ Kullanıcı bilgilerini ve token’ları döndür**
    return res.status(200).json(ApiResponse.success(200, "Oturum açıldı", {
      message: isNewDevice ? "Başarıyla yeni bir cihazdan giriş yapıldı" : "Başarıyla giriş yapıldı",
      info: userInfo,
      profiles,
      access_token,
      refresh_token,
      lang: geo ? (geo.country === "TR" ? "TR" : "EN") : "TR"
    }));

  } catch (error) {
    console.error("Login Error:", error.message);
    return res.status(500).json(ApiResponse.error(500, "Oturum açma hatası: " + error.message, { message: "Sunucu hatası, lütfen tekrar deneyin" }));
  }
});

const logout = asyncHandler(async (req, res) => {
  try {
    // **1️⃣ Kullanıcının Refresh Token'ını al**
    const refreshToken = req.cookies["refresh_token"];

    if (!refreshToken) {
      return res.status(400).json(ApiResponse.error(400, "Çıkış başarısız", { message: "Refresh token bulunamadı." }));
    }
    // **2️⃣ Keycloak üzerinden çıkış yap**
    await Keycloak.logoutUser(refreshToken);

    // **3️⃣ Çıkış yaptıktan sonra refresh token'ı cookie'den temizle**
    res.clearCookie("refresh_token");

    return res.status(200).json(ApiResponse.success(200, "Başarıyla çıkış yapıldı", { message: "Başarıyla çıkış yapıldı." }));

  } catch (error) {
    console.error("Logout Error:", error.message);
    return res.status(500).json(ApiResponse.error(500, "Çıkış hatası: " + error.message, { message: "Sunucu hatası, lütfen tekrar deneyin." }));
  }
});


//private public
const validate = asyncHandler(async (req, res) => {
  const access_token = req.kauth.grant.access_token.token;
  try {
    // **2️⃣ Kullanıcının ID’sini Keycloak üzerinden al**
    const validate = await Keycloak.validate(access_token)
    // **6️⃣ Kullanıcı bilgilerini ve token’ları döndür**
    if (validate) {
      return res.status(200).json(ApiResponse.success(200, "Access Token erişilebilir", {
        message: "Access Token erişilebilir",
      }));
    } else {
      return res.status(400).json(ApiResponse.success(400, "Access Token erişilebilir değil", {
        message: "Access Token erişilebilir değil",
      }));
    }


  } catch (error) {
    console.error("Login Error:", error.response?.data || error);
    return res.status(500).json(ApiResponse.error(500, "Kullanıcı bilgileri hatası: " + error.message, { message: "Sunucu hatası, lütfen tekrar deneyin" }));
  }
});

const refreshtoken = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies['refresh_token']; // Refresh Token'ı cookie'den al
  try {
    console.log("refreshToken", refreshToken)
    const response = await Keycloak.refreshUserToken(refreshToken)

    res.json({ access_token: response.data.access_token });
  } catch (error) {
    res.status(401).json({ error: 'Failed to refresh token' });
  }
});


module.exports = {
  refreshtoken, logout, register, login, validate, google, createurl
};
