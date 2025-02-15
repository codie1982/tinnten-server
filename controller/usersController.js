//General Library
const asyncHandler = require("express-async-handler");
//helper
const ApiResponse = require("../helpers/response.js")
const KeycloakService = require("../lib/Keycloak")

//private public
const info = asyncHandler(async (req, res) => {
  const access_token = req.kauth.grant.access_token.token;
  try {
    // **2️⃣ Kullanıcının ID’sini Keycloak üzerinden al**
    const userInfoResponse = await KeycloakService.getUserInfo(access_token)
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

module.exports = {
  info
};
