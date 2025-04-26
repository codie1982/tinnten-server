//General Library
const asyncHandler = require("express-async-handler");
var geoip = require('geoip-lite');
const jwt = require("jsonwebtoken");
const User = require("../mongoModels/userModel.js");
const MailVerify = require("../mongoModels/mailverifyModel.js");
const { OAuth2Client } = require("google-auth-library");
//helper
const ApiResponse = require("../helpers/response.js");
const Keycloak = require("../lib/Keycloak.js");
const { registerUser, loginUser } = require("../services/authServices.js");
const { sendVerificationEmail, checkMailVerifyCode, sendWelcomeMail } = require("../jobs/sendVerificationEmail.js")




const register = asyncHandler(async (req, res) => {
  const { email, device, provider, password, firstName, lastName } = req.body;

  try {
    await registerUser({ email, device, provider, password, firstName, lastName });
    loginData = await loginUser({ email, password: email, device, deviceid: "", userAgent, ip, geo });
    await sendVerificationEmail(loginData.userid, email, firstName || 'Kullanıcı');
    return res.status(201).json(ApiResponse.success(201, "", {
      status: { code: 201, description: "Success" },
      message: "Oturum açıldı",
      data: loginData,
      sendCode: false
    }));

  } catch (err) {
    console.error("❌ Register Error:", err.message);
    return res.status(500).json({ error: "Bir hata oluştu: " + err.message });
  }
});

const createurl = asyncHandler(async (req, res) => {
  try {
    const oAuth2Client = new OAuth2Client({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.REDIRECTURI,
    });

    const url = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: process.env.SCOPE,
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
  try {
    console.log("\u2728 Google Login Handler Ba\u015flad\u0131...");

    const code = req.query.code;
    if (!code) {
      console.error("\u26a0\ufe0f Google OAuth kodu eksik!");
      return res.status(400).json({ error: "Google OAuth kodu eksik!" });
    }

    const userAgent = req.headers["user-agent"];
    const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    const geo = geoip.lookup(ip);

    console.log("\u2728 Gelen IP:", ip);
    console.log("\u2728 User Agent:", userAgent);
    console.log("\u2728 Geo Bilgisi:", geo);

    // Google OAuth2 İstemcisi
    const oAuth2Client = new OAuth2Client({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.REDIRECTURI,
    });

    console.log("\u2728 Google OAuth2 Client Olusturuldu.");
    console.log("\u2728 GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID);
    console.log("\u2728 GOOGLE_CLIENT_SECRET:", process.env.GOOGLE_CLIENT_SECRET ? "***MASKELENDI***" : "Yok");
    console.log("\u2728 REDIRECTURI:", process.env.REDIRECTURI);

    // Google'dan token al
    console.log("\ud83d\udd17 Google'dan token al\u0131nıyor...");
    let tokensResponse;
    try {
      tokensResponse = await oAuth2Client.getToken(code);
    } catch (err) {
      console.error("\u274c Google Token Alma Hatas\u0131:", err.message);
      return res.status(500).json({ error: "Google token al\u0131namad\u0131! " + err.message });
    }

    const tokens = tokensResponse?.tokens;
    console.log("\u2728 Al\u0131nan Tokens:", tokens);

    if (!tokens || !tokens.access_token) {
      console.error("\u274c Google access_token eksik!");
      return res.status(400).json({ error: "Google token al\u0131namad\u0131!" });
    }

    // Kullanıcı bilgilerini al
    console.log("\ud83d\udcc8 Google Kullan\u0131c\u0131 verisi alınıyor...");
    let googleData;
    try {
      const response = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${tokens.access_token}`);
      googleData = await response.json();
    } catch (err) {
      console.error("\u274c Google Kullan\u0131c\u0131 Verisi Alma Hatas\u0131:", err.message);
      return res.status(500).json({ error: "Google kullan\u0131c\u0131 verisi al\u0131namad\u0131!" });
    }

    console.log("\u2728 Google Kullan\u0131c\u0131 Verisi:", googleData);

    const { sub, name, given_name, family_name, picture, email, email_verified } = googleData;

    if (!email_verified) {
      console.error("\u274c Email do\u011frulanmam\u0131\u015f.");
      return res.status(400).json({ error: "Email do\u011frulanmam\u0131\u015f." });
    }

    // Kullanıcı kontrol
    const device = "web";
    const provider = "google";
    let isExist = false;

    console.log("\u2728 Kullan\u0131c\u0131 Keycloak'da var m\u0131 kontrol ediliyor...");
    try {
      isExist = await Keycloak.isUserExist(email);
    } catch (err) {
      console.error("\u274c Keycloak Kullan\u0131c\u0131 Kontrol Hatas\u0131:", err.message);
      return res.status(500).json({ error: "Kullan\u0131c\u0131 kontrol\u00fc s\u0131ras\u0131nda hata olu\u015ftu." });
    }

    console.log("\u2728 Kullan\u0131c\u0131 Var M\u0131:", isExist);

    let loginData;
    try {
      if (isExist) {
        console.log("\u2728 Kullan\u0131c\u0131 var, login yapılıyor...");
        loginData = await loginUser({ email, password: email, device, deviceid: "", userAgent, ip, geo });
      } else {
        console.log("\u2728 Kullan\u0131c\u0131 yok, kay\u0131t yapılıp login yapılıyor...");
        await registerUser({ email, device, provider, password: email, firstName: given_name, lastName: family_name, picture });
        loginData = await loginUser({ email, password: email, device, deviceid: "", userAgent, ip, geo });
      }
    } catch (err) {
      console.error("\u274c Kullan\u0131c\u0131 Giri\u015f/Kay\u0131t Hatas\u0131:", err.message);
      return res.status(500).json({ error: "Kullan\u0131c\u0131 i\u015flemi s\u0131ras\u0131nda hata olu\u015ftu." });
    }

    console.log("\u2728 Kullan\u0131c\u0131 login verisi oluşturuldu.", loginData);

    const token = jwt.sign(loginData, process.env.JWT_SECRET_AUTH_TOKEN, { expiresIn: "7d" });
    console.log("\u2728 Kullanıcı login datası için oluşturulan token:", `${token}`);


    const isProduction = process.env.NODE_ENV === "production";
    
    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: isProduction, // HTTPS bağlantıda cookie gönder
      sameSite: 'Lax',        // Cross-site request'lerde dikkat
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 gün
    });

    console.log("\u2728 JWT token oluşturuldu ve cookie olarak set edildi.");

    const redirectUrl = process.env.BASE_FRONTEND_URL || "http://localhost:3000";

    console.log("\u2728 Kullanıcı frontend'e redirect ediliyor:", `${redirectUrl}/google-auth?success=true&token=${token}`);

    res.redirect(`${redirectUrl}/google-auth?success=true&token=${token}`);

  } catch (err) {
    console.error("\u274c Genel Google Auth Hatası:", err.message);
    return res.status(500).json({ error: "Bir hata olu\u015ftu: " + err.message });
  }
});
const googlelogin = asyncHandler(async (req, res) => {
  try {
    const authToken = req.body.token//req.cookies["auth_token"];
    if (!authToken) return res.status(600).json({ error: "auth token bulunmuyor" });

    try {
      const loginData = jwt.verify(authToken, process.env.JWT_SECRET_AUTH_TOKEN);

      res.cookie('refresh_token', loginData.refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
        path: '/',
      });

      return res.status(200).json(ApiResponse.success(200, "", {
        status: { code: 200, description: "Success" },
        message: "Oturum açıldı",
        data: loginData,
        sendCode: false
      }));
    } catch (err) {
      res.status(401).json({ error: "Geçersiz token" });
    }
  } catch (err) {
    console.error("❌ Genel Google Auth Hatası:", err.message);
    return res.status(500).json({ error: "Bir hata oluştu: " + err.message });
  }
});

const login = asyncHandler(async (req, res) => {
  const { email, password, device, deviceid } = req.body;
  const userAgent = req.headers["user-agent"];
  const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
  const geo = geoip.lookup(ip);

  try {
    const loginData = await loginUser({ email, password, device, deviceid, userAgent, ip, geo });
    // ✅ Refresh Token'ı Cookie'ye yazma işlemi burada yapılabilir
    res.cookie('refresh_token', loginData.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
      path: '/',
    });


    return res.status(200).json(ApiResponse.success(200, "", {
      status: { code: 200, description: "Success" },
      message: "Oturum açıldı",
      data: loginData,
      sendCode: false
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

const sendcode = asyncHandler(async (req, res) => {
  const access_token = req.kauth.grant.access_token.token;
  try {
    if (!access_token) {
      console.warn("Erişim tokeni bulunamadı veya geçersiz");
      return res.status(401).json(ApiResponse.error(401, "Yetkilendirme Hatası", {
        message: "Erişim tokeni bulunamadı veya geçersiz."
      }));
    }
    const userkey = await Keycloak.getUserInfo(access_token);
    const user = await User.findOne({ keyid: userkey.sub });
    if (!user) {
      return res.status(404).json(ApiResponse.error(404, "Kullanıcı Bulunamadı", {
        message: "Belirtilen kullanıcı sistemde kayıtlı değil."
      }));
    }
    const userid = user._id;
    try {
      console.log("sendVerificationEmail")

      const verifyCode = await MailVerify.findOne({ userid })
      console.log("verifyCode",verifyCode)
      if (verifyCode) return res.status(404).json(ApiResponse.error(404, "Aktif bir kodu bulunmakta", {
        message: "Aktif bir kodunuz bulunmakta. Bir süre sonra tekrar deneyin."
      }));

      await sendVerificationEmail(userid, 'granitjeofizik@gmail.com', user.firstName || 'Kullanıcı');

      return res.status(200).json(ApiResponse.success(200, "Doğrulama kodu gönderildi", { sendcode: true }));
    } catch (error) {
      console.error("Doğrulama kodu gönderilirken hata oluştu:", error.message);
      return res.status(500).json(ApiResponse.error(500, "Doğrulama kodu gönderilemedi", {
        message: "Bir hata oluştu, lütfen daha sonra tekrar deneyin."
      }));
    }
  } catch (error) {
    console.error("Kullanıcı bilgileri alınırken hata oluştu:", error.message);
    return res.status(500).json(ApiResponse.error(500, "Kullanıcı bilgileri alınamadı", {
      message: "Bir hata oluştu, lütfen daha sonra tekrar deneyin."
    }));
  }
});

const mailverify = asyncHandler(async (req, res) => {
  const { code } = req.body;
  console.log("code", code)
  const access_token = req.kauth.grant.access_token.token;

  if (!access_token) {
    console.warn("Erişim tokeni bulunamadı veya geçersiz");
    return res.status(401).json(ApiResponse.error(401, "Yetkilendirme Hatası", {
      message: "Erişim tokeni bulunamadı veya geçersiz."
    }));
  }

  const userkey = await Keycloak.getUserInfo(access_token);
  console.log("userkey", userkey)

  const useremail = userkey.email;
  const user = await User.findOne({ keyid: userkey.sub });

  if (!user) {
    return res.status(404).json(ApiResponse.error(404, "Kullanıcı Bulunamadı", {
      message: "Belirtilen kullanıcı sistemde kayıtlı değil."
    }));
  }
  const userid = user._id;
  console.log("userid", userid)

  try {
    console.log("userid, code", userid, code)
    const isVerify = await checkMailVerifyCode(userid, code);
    console.log("isVerify", isVerify)
    if (!isVerify) {
      return res.status(404).json(ApiResponse.error(404, "Doğrulama Hatası", {
        message: "Girilen doğrulama kodu hatalı."
      }));
    }
    await Keycloak.verifyUserEmail(useremail);
    // Refresh token after verifying email, using existing refresh token from cookies
    //await sendWelcomeMail("granitjeofizik@gmail.com", "Engin EROL")
    return res.json(ApiResponse.success(200, "wellcode tinnten", { message: "Tinnten\'e Hoşgeldiniz" }));
  } catch (error) {
    console.error("Doğrulama sırasında hata:", error.message);
    return res.status(500).json(ApiResponse.error(500, "Doğrulama Hatası", {
      message: error.message
    }));
  }
});

const refreshtoken = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies['refresh_token']; // Refresh Token'ı cookie'den al
  try {
    const response = await Keycloak.refreshUserToken(refreshToken)

    res.json({ access_token: response.data.access_token });
  } catch (error) {
    res.status(401).json({ error: 'Failed to refresh token' });
  }
});


module.exports = {
  refreshtoken, logout, register, login, validate, google, googlelogin, createurl, sendcode, mailverify
};
