//General Library
const asyncHandler = require("express-async-handler");
const axios = require("axios");
const { v4: uuidv4 } = require('uuid');


//helper
const ApiResponse = require("../helpers/response")
const CONSTANT = require("../constant/users/constant")
const KEYCLOAK_BASE_URL = "http://localhost:8080"; // Keycloak URL
const REALM = "tinnten-realm"; // Keycloak Realm adı
const CLIENT_ID = "tinnten-client"; // Keycloak Client ID
const CLIENT_SECRET = "y3P6T54oFpneKZQZdibTmdbKNXSPUwrQ"; // Client Secret (Confidential Clients için)

const User = require("../models/userModel")
const Conversation = require("../models/conversationModel");


const system_message = [
  {
    human_message: "Merhaba!",
    system_message: "Tabii ki sizin için en iyi seçimleri bulmaya çalışacağım.",
    recommendation_products: [
      {
        productGroup: {
          id: 1,
          product_group_name: "Bisiklet",
          product_list: [
            {
              product_name: "15 Jant Kız Bisikleti Pembe",
              product_image: "https://m.media-amazon.com/images/I/61SDGi3p00L.__AC_SY300_SX300_QL70_ML2_.jpg",
              product_price: "1.970,00 TL",
              product_brand: "Bisiklet Markası",

            },
            {
              product_name: "18 Jant Erkek Bisikleti Siyah",
              product_image: "https://productimages.hepsiburada.net/s/424/960-1280/110000454576458.jpg",
              product_price: "2.500,00 TL",
              product_brand: "Bisiklet Markası"
            },
            {
              product_name: "15 Jant Kız Bisikleti Pembe",
              product_image: "https://m.media-amazon.com/images/I/71fv5NCG97L._AC_SL1500_.jpg",
              product_price: "1.970,00 TL",
              product_brand: "Bisiklet Markası"
            },
            {
              product_name: "18 Jant Erkek Bisikleti Siyah",
              product_image: "https://productimages.hepsiburada.net/s/424/960-1280/110000454576458.jpg",
              product_price: "2.500,00 TL",
              product_brand: "Bisiklet Markası"
            },
            {
              product_name: "15 Jant Kız Bisikleti Pembe",
              product_image: "https://m.media-amazon.com/images/I/61SDGi3p00L.__AC_SY300_SX300_QL70_ML2_.jpg",
              product_price: "1.970,00 TL",
              product_brand: "Bisiklet Markası"
            },
            {
              product_name: "18 Jant Erkek Bisikleti Siyah",
              product_image: "https://productimages.hepsiburada.net/s/424/960-1280/110000454576458.jpg",
              product_price: "2.500,00 TL",
              product_brand: "Bisiklet Markası"
            },
            {
              product_name: "18 Jant Erkek Bisikleti Siyah",
              product_image: "https://productimages.hepsiburada.net/s/424/960-1280/110000454576458.jpg",
              product_price: "2.500,00 TL",
              product_brand: "Bisiklet Markası"
            },
            {
              product_name: "18 Jant Erkek Bisikleti Siyah",
              product_image: "https://productimages.hepsiburada.net/s/424/960-1280/110000454576458.jpg",
              product_price: "2.500,00 TL",
              product_brand: "Bisiklet Markası"
            }
          ],
          filter: [
            {
              id: 11,
              title: "brand",
              options: ["marka-1", "marka-2", "marka-3"],
            },
            {
              id: 12,
              title: "color",
              options: ["renk-1", "renk-2", "renk-3"],
            },
            {
              id: 13,
              title: "size",
              options: ["size-1", "size-2", "size-3"]
            }
          ]
        }
      },
      {
        productGroup: {
          id: 2,
          product_group_name: "Bisiklet Aksesuarları",
          product_list: [
            {
              product_name: "Bisiklet Kaskı",
              product_image: "bisiklet_kaski.jpg",
              product_price: "150,00 TL",
              product_brand: "Aksesuar Markası",
            },
            {
              product_name: "Bisiklet Çantası",
              product_image: "bisiklet_cantasi.jpg",
              product_price: "100,00 TL",
              product_brand: "Aksesuar Markası",
            }
          ],
          filter: [
            {
              id: 21,
              title: "brand",
              options: ["marka-1", "marka-2", "marka-3"],
            },
            {
              id: 22,
              title: "color",
              options: ["renk-1", "renk-2", "renk-3"],
            },
            {
              id: 23,
              title: "size",
              options: ["size-1", "size-2", "size-3"]
            }
          ]
        }
      }
    ],
  },
]
//privete public
const chat = asyncHandler(async (req, res) => {
  const { id, promt } = req.body
  console.log("conversationid", id)

  const access_token = req.kauth.grant.access_token.token;
  try {
    // **2️⃣ Kullanıcının ID’sini Keycloak üzerinden al**
    const userInfoResponse = await axios.get(`${KEYCLOAK_BASE_URL}/realms/${REALM}/protocol/openid-connect/userinfo`, {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    const userid = userInfoResponse.data.sub

    // **6️⃣ Kullanıcı bilgilerini ve token’ları döndür**
    return res.status(200).json(ApiResponse.success(200, "Sistem mesajı", {
      message: "system_mesajı",
      system_message: system_message,
    }));

  } catch (error) {
    console.error("Login Error:", error.response?.data || error);
    return res.status(500).json(ApiResponse.error(500, "Kullanıcı bilgileri hatası: " + error.message, { message: "Sunucu hatası, lütfen tekrar deneyin" }));
  }
});

//privete public
const create = asyncHandler(async (req, res) => {
  const { title } = req.body
  const access_token = req.kauth.grant.access_token.token;
  try {
    const oldCnnv = await Conversation.findOne({ title: title });
    if (oldCnnv) return res.status(400).json(ApiResponse.error(400, "Konuşma başlığı daha önce girilmiş", { message: "Bu başlıkla zaten bir konuşma mevcut" }));
    // **2️⃣ Kullanıcının ID’sini Keycloak üzerinden al**
    const userInfoResponse = await axios.get(`${KEYCLOAK_BASE_URL}/realms/${REALM}/protocol/openid-connect/userinfo`, {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    const user = await User.findOne({ subid: userInfoResponse.data.sub });

    const doc = new Conversation();
    doc.id = uuidv4()
    doc.user = user._id;
    doc.title = title
    const nConversation = await doc.save()
    if (nConversation) {
      return res.status(200).json(ApiResponse.success(200, "konuşma başlatıldı", {
        message: "konuşma başlatıldı",
        conversationid: nConversation.id,
      }));
    } else {
      return res.status(500).json(ApiResponse.error(500, "Konuşma başlatılamadı", { message: "Konuşma oluşturulurken bir hata oluştu" }));
    }

  } catch (error) {
    console.error("Login Error:", error.response?.data || error);
    return res.status(500).json(ApiResponse.error(500, "Kullanıcı bilgileri hatası: " + error.message, { message: "Sunucu hatası, lütfen tekrar deneyin" }));
  }
});


//privete public
const history = asyncHandler(async (req, res) => {
  const access_token = req.kauth.grant.access_token.token;
  try {
    // **2️⃣ Kullanıcının ID’sini Keycloak üzerinden al**
    const userInfoResponse = await axios.get(`${KEYCLOAK_BASE_URL}/realms/${REALM}/protocol/openid-connect/userinfo`, {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    const userid = userInfoResponse.data.sub



    const historyies = []
    for (let i = 0; i < 10; i++) {
      const history = {
        title: "Arama : " + " - " + (i + 1), id: uuidv4()
      }
      historyies.push(history)
    }

    // **6️⃣ Kullanıcı bilgilerini ve token’ları döndür**
    return res.status(200).json(ApiResponse.success(200, "Konuşma geçmişi", {
      message: "Konuşma geçmişi",
      historyies,
    }));

  } catch (error) {
    console.error("Login Error:", error.response?.data || error);
    return res.status(500).json(ApiResponse.error(500, "Kullanıcı bilgileri hatası: " + error.message, { message: "Sunucu hatası, lütfen tekrar deneyin" }));
  }
});
module.exports = {
  create, chat, history
};
