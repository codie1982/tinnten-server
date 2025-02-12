//General Library
const asyncHandler = require("express-async-handler");
const axios = require("axios");
const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs");
var geoip = require('geoip-lite');
const { v4: uuidv4 } = require('uuid');
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/userModel.js");
const Profil = require("../models/userProfilModel")
const Phone = require("../models/phoneModel")
const Addres = require("../models/addresModel")
const Social = require("../models/socilaLinksModel")
const Package = require("../models/packageModel")
const Account = require("../models/accountModel")
//helper
const ApiResponse = require("../helpers/response.js")
const CONSTANT = require("../constant/users/constant.js")
const { publishToQueue } = require('../services/rabbitService');


const KEYCLOAK_BASE_URL = process.env.KEYCLOAK_BASE_URL; // Keycloak URL
const REALM = process.env.REALM; // Keycloak Realm adı
const CLIENT_ID = process.env.CLIENT_ID; // Keycloak Client ID
const CLIENT_SECRET = process.env.CLIENT_SECRET; // Client Secret (Confidential Clients için)

// **Kullanıcı kaydı oluşturma**
const register = asyncHandler(async (req, res) => {
  const { email, device, provider, password } = req.body;
  const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
  const geo = geoip.lookup(ip);
  try {
    if (provider !== CONSTANT.EMAIL) {
      return res.status(400).json(ApiResponse.error({}, 400, "Giriş noktası belli değil."));
    }

    const userAgent = req.headers["user-agent"]; // Kullanıcı ajanı (tarayıcı bilgisi)
    const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress; // Kullanıcının IP adresi

    // **1️⃣ Geçerlilik Kontrolleri**
    if (!email || !password) {
      return res.status(400).json(ApiResponse.error({}, 400, "Lütfen tüm alanları doldurun."));
    }

    if (password.length < 8) {
      return res.status(400).json(ApiResponse.error(400, "Şifre en az 8 karakter olmalıdır", {}));
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json(ApiResponse.error({}, 400, "Geçerli bir e-posta adresi girin."));
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json(ApiResponse.error(400, "Şifre en az bir büyük harf, bir küçük harf, bir sayı ve özel karakter içermelidir", {}));
    }

    // **2️⃣ Keycloak Admin Token Al**
    const adminTokenResponse = await axios.post(
      `${KEYCLOAK_BASE_URL}/realms/master/protocol/openid-connect/token`,
      new URLSearchParams({
        client_id: process.env.ADMIN_CLIENT_ID,
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
        grant_type: "password"
      })
    );
    const adminAccessToken = adminTokenResponse.data.access_token;

    // **3️⃣ Kullanıcının Var Olup Olmadığını Kontrol Et (Keycloak API)**
    try {
      const existingUserResponse = await axios.get(
        `${KEYCLOAK_BASE_URL}/admin/realms/${REALM}/users?email=${email}`,
        { headers: { Authorization: `Bearer ${adminAccessToken}` } }
      );

      if (existingUserResponse.data.length > 0) {
        return res.status(400).json(ApiResponse.error({}, 400, "Bu e-posta adresi zaten kayıtlı."));
      }

    } catch (error) {
      console.error("User existence check failed:", error.response ? error.response.data : error.message);
    }

    // **4️⃣ Keycloak Üzerinde Yeni Kullanıcı Oluştur**
    const createUserResponse = await axios.post(
      `${KEYCLOAK_BASE_URL}/admin/realms/${REALM}/users`,
      {
        email,
        username: email, // Keycloak username yerine e-posta kullanıyor.
        enabled: true,
        emailVerified: false,
        requiredActions: [],
        credentials: [
          {
            type: "password",
            value: password,
            temporary: false
          }
        ],
        attributes: {
          device,
          provider,
          userAgent,
          ip
        }
      },
      { headers: { Authorization: `Bearer ${adminAccessToken}` } }
    );


    if (createUserResponse.status === 201) {
      console.log("Keycloak User Created Successfully!");


      // **6️⃣ Kullanıcı Otomatik Olarak Oturum Açsın (Access Token & Refresh Token Al)**
      const tokenResponse = await axios.post(
        `${KEYCLOAK_BASE_URL}/realms/${REALM}/protocol/openid-connect/token`,
        new URLSearchParams({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          username: email,
          password: password,
          grant_type: "password",
          scope: "openid email profile"
        })
      );

      const { access_token, refresh_token } = tokenResponse.data;

      // ✅ Refresh Token'ı Cookie'ye yaz
      res.cookie('refresh_token', refresh_token, {
        httpOnly: true,     // XSS saldırılarına karşı koruma
        secure: false,      // HTTPS kullanıyorsan true yap
        sameSite: 'Lax',     // Cross-site istekleri için uygun
        path: '/',
      });

      // **2️⃣ Kullanıcının ID’sini Keycloak üzerinden al**
      const userInfoResponse = await axios.get(`${KEYCLOAK_BASE_URL}/realms/${REALM}/protocol/openid-connect/userinfo`, {
        headers: { Authorization: `Bearer ${access_token}` }
      });

      // **2️⃣ Kullanıcı ID'sini al**
      const usersResponse = await axios.get(
        `${KEYCLOAK_BASE_URL}/admin/realms/${REALM}/users?email=${email}`,
        { headers: { Authorization: `Bearer ${adminAccessToken}` } }
      );

      if (usersResponse.data.length === 0) {
        return res.status(400).json(ApiResponse.error({}, 400, "Kullanıcı bulunamadı."));
      }

      let userDoc = new User()
      userDoc.subid = userInfoResponse.data.sub;
      let nUser = await userDoc.save()
      let userid;
      if (!nUser) return res.status(400).json(ApiResponse.error(400, "Kullanıcı oluşturulamadı", {}));
      userid = nUser._id

      const sPackage = await Package.findOne({ default_package: true, delete: false, active: true })
      const accountDoc = new Account({
        userid,
        packages: [{ packageid: sPackage._id, }]
      })
      let nAccount = await accountDoc.save()

      let phoneDoc = new Phone()
      phoneDoc.userid = userid
      let nPhone = await phoneDoc.save()

      let addresDoc = new Addres()
      addresDoc.userid = userid
      let nAddres = await addresDoc.save()

      let socialDoc = new Social()
      socialDoc.userid
      let nSocial = await socialDoc.save()


      let profilDoc = new Profil()
      profilDoc.userid = userid;
      profilDoc.account = [nAccount._id]
      profilDoc.phone = [nPhone._id]
      profilDoc.addres = [nAddres._id]
      profilDoc.social = nSocial._id
      let nProfil = await profilDoc.save()


      try {
        // 📤 Mail kuyruğuna gönderim
        await publishToQueue('email_queue', {
          type: 'email',
          data: {
            to: email,
            subject: 'Kayıt Başarılı!',
            message: `kayıt işleminiz başarıyla tamamlandı!`
          } 
        });
        // **5️⃣ Kullanıcıya E-Posta Aktivasyon Bağlantısı Gönder (Opsiyonel)**
        const emailResponse = await sendDeviceEmailVerify(email, "Kullancı Adı", new Date(), device, userAgent, ip);
        if (emailResponse) {
          return res.status(201).json(ApiResponse.success(201, "Kaydınız başarı ile yapıldı. Oturum açıldı. E-posta doğrulama bağlantısı gönderildi", {
            access_token,
            refresh_token,
            user: userInfoResponse.data,
            profil: nProfil
          }));
        } else {
          return res.status(201).json(ApiResponse.success(201, "Kaydınız başarı ile yapıldı. Oturum açıldı. E-posta doğrulama bağlantısı gönderilemedi. Mail doğrulamanızı daha sonra yapabilirsiniz.", {
            access_token,
            refresh_token,
            user: userInfoResponse.data,
          }));
        }

      } catch (error) {
        console.log("emailResponse error", error.response ? error.response.data : error.message);
      }
    }

    return res.status(400).json(ApiResponse.error(400, "Kullanıcı oluşturulamadı", {}));

  } catch (err) {
    console.error("Register Error:", err.response ? err.response.data : err.message);
    return res.status(500).json(ApiResponse.error({}, 500, "Veritabanı hatası: " + err.message));
  }
});

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

// **Kullanıcı Profili oluşturma**
const userImage = asyncHandler(async (req, res) => {
  const access_token = req.kauth.grant.access_token.token;
  const { firstname, lastname, } = req.body;
  if (!req.file) {
    const profileImageUrl = req.file.filename;

  }
  try {
    // **2️⃣ Kullanıcının ID’sini Keycloak üzerinden al**
    const userInfoResponse = await axios.get(`${KEYCLOAK_BASE_URL}/realms/${REALM}/protocol/openid-connect/userinfo`, {
      headers: { Authorization: `Bearer ${access_token}` }
    });











    const { access_token, refresh_token } = tokenResponse.data;




    // **2️⃣ Kullanıcı ID'sini al**
    const usersResponse = await axios.get(
      `${KEYCLOAK_BASE_URL}/admin/realms/${REALM}/users?email=${email}`,
      { headers: { Authorization: `Bearer ${adminAccessToken}` } }
    );

    if (usersResponse.data.length === 0) {
      return res.status(400).json(ApiResponse.error({}, 400, "Kullanıcı bulunamadı."));
    }

    const userId = usersResponse.data[0].id;
    const emailResponse = { data: [] };

    try {
      // **3️⃣ Kullanıcıya e-posta doğrulama linki gönder**
      emailResponse = await axios.put(
        `${KEYCLOAK_BASE_URL}/admin/realms/${REALM}/users/${userId}/send-verify-email`,
        {},
        { headers: { Authorization: `Bearer ${adminAccessToken}` } }
      );

    } catch (error) {
      console.log("emailResponse error", error.response ? error.response.data : error.message);
    }

    return res.status(200).json(ApiResponse.success(200, "Profil resmi başarı ile eklendi", {
      access_token,
      refresh_token,
      user: userInfoResponse.data,
    }));



  } catch (err) {
    console.error("Register Error:", err.response ? err.response.data : err.message);
    return res.status(500).json(ApiResponse.error({}, 500, "Veritabanı hatası: " + err.message));
  }
});

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
    // **1️⃣ Keycloak üzerinden JWT Token al**
    const tokenResponse = await axios.post(`${KEYCLOAK_BASE_URL}/realms/${REALM}/protocol/openid-connect/token`, new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      username: email,
      password: password,
      grant_type: "password",
      scope: "openid email"
    }));

    const { access_token, refresh_token, id_token } = tokenResponse.data;

    // ✅ Refresh Token'ı Cookie'ye yaz
    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,     // XSS saldırılarına karşı koruma
      secure: false,      // HTTPS kullanıyorsan true yap
      sameSite: 'Lax',     // Cross-site istekleri için uygun
      path: '/',
    });

    // **2️⃣ Kullanıcının ID’sini Keycloak üzerinden al**
    const userInfoResponse = await axios.get(`${KEYCLOAK_BASE_URL}/realms/${REALM}/protocol/openid-connect/userinfo`, {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    const userId = userInfoResponse.data.sub;

    // **3️⃣ Admin Token Al**
    const adminTokenResponse = await axios.post(
      `${KEYCLOAK_BASE_URL}/realms/master/protocol/openid-connect/token`,
      new URLSearchParams({
        client_id: process.env.ADMIN_CLIENT_ID,
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
        grant_type: "password"
      })
    );
    const adminAccessToken = adminTokenResponse.data.access_token;


    // **3️⃣ Kullanıcının aktif oturumlarını al**
    const activeSessions = await axios.get(`${KEYCLOAK_BASE_URL}/admin/realms/${REALM}/users/${userId}/sessions`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` }
    });

    let isSameDevice = false;
    let isNewDevice = true;
    let sameSession;

    activeSessions.data.forEach((session) => {
      if (session.ipAddress === ip && session.userAgent === userAgent) {
        isSameDevice = true;
        sameSession = session;
      }
      if (session.deviceInfo?.deviceid === deviceid) {
        isNewDevice = false;
      }
    });

    if (isSameDevice) {
      // **Mevcut oturum zaten varsa, yeni giriş açma**
      return res.status(400).json(ApiResponse.error(400, "Bu cihaz zaten oturum açık", {
        message: "Bu cihazda zaten aktif bir oturumunuz var."
      }));
    }
    // **4️⃣ Kullanıcının maksimum oturum sayısını kontrol et**
    const MAX_SESSIONS = 3;
    if (activeSessions.data.length > MAX_SESSIONS) {
      // **Oturumları başlama tarihine göre sırala (En yeni oturumlar en sona gelsin)**
      const sortedSessions = activeSessions.data.sort((a, b) => new Date(a.start) - new Date(b.start));

      // **Silinmesi gereken oturumları belirle (En eski olanları kapat)**
      const sessionsToDelete = sortedSessions.slice(0, activeSessions.data.length - 3); // En yeni 3 tanesi hariç diğerlerini seç

      for (const session of sessionsToDelete) {
        const sessionId = session.id;
        try {
          const deleteResponse = await axios.delete(
            `${KEYCLOAK_BASE_URL}/admin/realms/${REALM}/users/${userId}/sessions/${sessionId}`,
            { headers: { Authorization: `Bearer ${adminAccessToken}` } }
          );
          console.log(`Session ${sessionId} deleted successfully:`, deleteResponse.status);
        } catch (error) {
          console.error(`Session ${sessionId} delete failed:`, error.response ? error.response.data : error.message);
        }
      }
    }

    // **5️⃣ Kullanıcı yeni bir cihazdan giriş yaptıysa e-posta bildirimi gönder**
    if (isNewDevice) {
      await sendDeviceChangeEmail(email, userInfoResponse.data.name, new Date(), device, userAgent, ip);
    }

    // **6️⃣ Kullanıcı bilgilerini ve token’ları döndür**
    return res.status(200).json(ApiResponse.success(200, "Oturum açıldı", {
      message: isNewDevice ? "Başarıyla yeni bir cihazdan giriş yapıldı" : "Başarıyla giriş yapıldı",
      user: userInfoResponse.data,
      access_token,
      refresh_token,
      lang: geo ? (geo.country === "TR" ? "TR" : "EN") : "TR"
    }));

  } catch (error) {
    console.error("Login Error:", error.response?.data || error);
    return res.status(500).json(ApiResponse.error(500, "Oturum açma hatası: " + error.message, { message: "Sunucu hatası, lütfen tekrar deneyin" }));
  }
});

//access public
const info = asyncHandler(async (req, res) => {
  const access_token = req.kauth.grant.access_token.token;

  try {
    // **2️⃣ Kullanıcının ID’sini Keycloak üzerinden al**
    const userInfoResponse = await axios.get(`${KEYCLOAK_BASE_URL}/realms/${REALM}/protocol/openid-connect/userinfo`, {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    // **6️⃣ Kullanıcı bilgilerini ve token’ları döndür**
    return res.status(200).json(ApiResponse.success(200, "Kullanıcı bilgileri", {
      message: "Kullanıcı bilgileri başarı ile alındı",
      user: userInfoResponse.data,
    }));

  } catch (error) {
    console.error("Login Error:", error.response?.data || error);
    return res.status(500).json(ApiResponse.error(500, "Kullanıcı bilgileri hatası: " + error.message, { message: "Sunucu hatası, lütfen tekrar deneyin" }));
  }
});

const sendEmailVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;

  try {
    // **1️⃣ Keycloak Admin Token Al**
    const adminTokenResponse = await axios.post(
      `${KEYCLOAK_BASE_URL}/realms/master/protocol/openid-connect/token`,
      new URLSearchParams({
        client_id: "admin-cli",
        username: "admin",
        password: "admin",
        grant_type: "password"
      })
    );
    const adminAccessToken = adminTokenResponse.data.access_token;

    // **2️⃣ Kullanıcı ID'sini al**
    const usersResponse = await axios.get(
      `${KEYCLOAK_BASE_URL}/admin/realms/${REALM}/users?email=${email}`,
      { headers: { Authorization: `Bearer ${adminAccessToken}` } }
    );

    if (usersResponse.data.length === 0) {
      return res.status(400).json(ApiResponse.error({}, 400, "Kullanıcı bulunamadı."));
    }

    const userId = usersResponse.data[0].id;

    // **3️⃣ Kullanıcıya e-posta doğrulama linki gönder**
    await axios.put(
      `${KEYCLOAK_BASE_URL}/admin/realms/${REALM}/users/${userId}/send-verify-email`,
      {},
      { headers: { Authorization: `Bearer ${adminAccessToken}` } }
    );

    return res.status(200).json(ApiResponse.success(200, "E-posta doğrulama bağlantısı gönderildi.", {}));

  } catch (err) {
    console.error("Email Verification Error:", err.response ? err.response.data : err.message);
    return res.status(500).json(ApiResponse.error({}, 500, "E-posta doğrulama hatası: " + err.message));
  }
});

// **Yeni bir cihazdan giriş olduğunda e-posta bildirimi gönderme**
async function sendDeviceChangeEmail(email, name, date, device, userAgent, ip) {
  console.log(`📧 [E-Mail] ${email} - Yeni cihaz girişi: ${device}, IP: ${ip}`);
  // Burada e-posta gönderme kodunu ekleyebilirsin.
}
// **Yeni bir cihazdan giriş olduğunda e-posta bildirimi gönderme**
async function sendDeviceEmailVerify(email) {
  console.log(`📧 [E-Mail] ${email} - Email doğrulama maili`);
  // Burada e-posta gönderme kodunu ekleyebilirsin.
}
function isSingleWord(str) {
  return !str.includes(' ');
}
module.exports = {
  register, login, info
};
