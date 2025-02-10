//General Library
const asyncHandler = require("express-async-handler");
const axios = require("axios");
const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs");
var geoip = require('geoip-lite');
const { v4: uuidv4 } = require('uuid');
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/userModel.js");
//helper
const ApiResponse = require("../helpers/response.js")
const CONSTANT = require("../constant/users/constant.js")
const KEYCLOAK_BASE_URL = "http://localhost:8080"; // Keycloak URL
const REALM = "tinnten-realm"; // Keycloak Realm adı
const CLIENT_ID = "tinnten-client"; // Keycloak Client ID
const CLIENT_SECRET = "y3P6T54oFpneKZQZdibTmdbKNXSPUwrQ"; // Client Secret (Confidential Clients için)

//access public
const refreshtoken = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies['refresh_token']; // Refresh Token'ı cookie'den al
    try {
      const response = await axios.post(`${KEYCLOAK_BASE_URL}/realms/${REALM}/protocol/openid-connect/token`, 
        new URLSearchParams({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET, // ✅ Client Secret ekledik
            grant_type: 'refresh_token',
            refresh_token: refreshToken
        }), 
        {
            headers: { 
                'Content-Type': 'application/x-www-form-urlencoded' 
            }
        }
    );

        res.json({ access_token: response.data.access_token });
    } catch (error) {
        res.status(401).json({ error: 'Failed to refresh token' });
    }
});
//access public
const checksession = asyncHandler(async (req, res) => {
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

const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies['refresh_token']; // Refresh Token'ı cookie'den al

  try {
    // Keycloak'tan çıkış yap
    await axios.post(`${KEYCLOAK_BASE_URL}/realms/${REALM}/protocol/openid-connect/logout`, 
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: refreshToken
      }), 
      {
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded' 
        }
      }
    );

    // Çıkış yaptıktan sonra refresh token'ı cookie'den sil
    res.clearCookie('refresh_token');
    return res.status(200).json(ApiResponse.success(200, "Başarıyla çıkış yapıldı", { message: "Başarıyla çıkış yapıldı" }));

  } catch (error) {
    console.error("Logout Error:", error.response?.data || error);
    return res.status(500).json(ApiResponse.error(500, "Çıkış hatası: " + error.message, { message: "Sunucu hatası, lütfen tekrar deneyin" }));
  }
});


module.exports = {
  refreshtoken,checksession,logout
};
