//General Library
const asyncHandler = require("express-async-handler");
const axios = require("axios");
const { v4: uuidv4 } = require('uuid');


//helper
const ApiResponse = require("../../helpers/response.js")
const User = require("../../models/userModel.js")
const Conversation = require("../../models/conversationModel.js");
const Message = require("../../models/messageModel.js");
const Behaviors = require("../../models/userBehaviorModel.js");
const Questions = require("../../models/questionAnswerModel.js");


const Keycloak = require("../../lib/Keycloak.js");
const { systemContext } = require("../../llm/procedure.js")

const CONSTANT = { active: "active" }
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
const conversation = asyncHandler(async (req, res) => {
  // İlk olarak konuşmayı Redis'ten aramamız gerekiyor. Eğer yok ise DB'den eski konuşma var mı diye kontrol etmeliyiz.
  const { conversationid, human_message } = req.body;
  let { title } = req.body;
  const access_token = req.kauth.grant.access_token.token;
  const userkey = await Keycloak.getUserInfo(access_token);
  const user = await User.findOne({ keyid: userkey.sub });

  if (!user) {
    return res.status(404).json({ success: false, message: "Kullanıcı bulunamadı." });
  }

  // Aynı başlığa sahip konuşmayı kontrol et
  if (human_message == null || human_message == "") {
    return res.status(400).json(ApiResponse.error(400, "mesaj bloğu boş olamaz", { message: "mesaj bloğu boş olamaz" }));
  }

  const userid = user._id;
  let nConversation = null;

  try {
    if (conversationid) {
      // Mevcut konuşmayı bul
      nConversation = await Conversation.findOne({
        conversationid,
        userid,
        status: CONSTANT.active,
        delete: false
      });
    } else {
      if (!title) {
        return res.status(400).json({ success: false, message: "Başlık zorunludur." });
      }
      title = title.trim().toLowerCase();

      // Aynı başlığa sahip konuşmayı kontrol et
      const oldCnnv = await Conversation.findOne({ title: title, status: CONSTANT.active, delete: false });
      if (oldCnnv) {
        return res.status(400).json(ApiResponse.error(400, "Konuşma başlığı daha önce girilmiş", { message: "Bu başlıkla zaten bir konuşma mevcut" }));
      }

      // Yeni konuşma başlat
      nConversation = new Conversation({
        conversationid: uuidv4(),
        userid,
        title,
        messages: []
      });
      await nConversation.save();
    }

    // İlk mesajı ekle (Eğer gönderildiyse)
    let messageIds = [];

    if (human_message) {
      // Kullanıcının mesajını oluştur
      const humanMessage = new Message({
        type: "human_message",
        content: human_message,
      });

      // LLM'in sistem cevabını oluştur
      const systemMessage = new Message({
        type: "system_message",
        content: "llm cevabı",
      });

      await Message.insertMany([humanMessage, systemMessage]);
      messageIds.push(humanMessage._id, systemMessage._id);
    }

    // Konuşmaya mesajları ekleyelim
    if (messageIds.length > 0) {
      nConversation.messages = [...nConversation.messages, ...messageIds];
      await nConversation.save();
    }

    // Mesajları populate etmeden önce konuşmayı tekrar yükle
    nConversation = await Conversation.findOne({ conversationid: nConversation.conversationid }).populate("messages");

    if (nConversation) {
      return res.status(200).json(ApiResponse.success(200, "", {
        success: true,
        message: "Konuşma başarıyla oluşturuldu!",
        conversation: nConversation
      }));
    }
  } catch (error) {
    console.error("Konuşma oluşturulurken hata oluştu:", error);
    return res.status(500).json(ApiResponse.error(500, "", {
      success: false,
      message: "Konuşma oluşturulurken hata oluştu.",
      error: error.message
    }));
  }
});

const create = asyncHandler(async (req, res) => {
  const access_token = req.kauth.grant.access_token.token;
  const userkey = await Keycloak.getUserInfo(access_token);
  const user = await User.findOne({ keyid: userkey.sub });

  if (!user) {
    return res.status(404).json(ApiResponse.error(404, "Kullanıcı bulunamadı", { message: "Geçersiz kullanıcı" }));
  }

  const userid = user._id;
  let { title } = req.body;

  // Başlığı temizleyerek standart hale getir
  title = title.trim().toLowerCase();

  try {
    // Aynı başlığa sahip konuşmayı kontrol et
    const oldCnnv = await Conversation.findOne({ title: title, status: CONSTANT.active, delete: false });
    if (oldCnnv) {
      return res.status(400).json(ApiResponse.error(400, "Konuşma başlığı daha önce girilmiş", { message: "Bu başlıkla zaten bir konuşma mevcut" }));
    }

    // Konuşma nesnesini oluştur
    const _conversation = new Conversation({
      conversationid: uuidv4(),
      userid,
      title,
      messages: [],
      context: systemContext() || "",  // Eğer `systemContext` tanımlı değilse boş string ata
    });

    // Konuşmayı kaydet
    const nConversation = await _conversation.save();
    if (nConversation) {
      return res.status(200).json(ApiResponse.success(200, "Konuşma başlatıldı", {
        message: "Konuşma başlatıldı",
        conversationid: nConversation.conversationid,
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
const detail = asyncHandler(async (req, res) => {
  const { conversationid } = req.params;
  try {
    if (!conversationid) {
      return res.status(400).json(ApiResponse.error(400, "Konuşma ID eksik", { message: "Geçerli bir konuşma ID'si sağlamalısınız" }));
    }
    const access_token = req.kauth.grant.access_token.token;
    const userkey = await Keycloak.getUserInfo(access_token);
    const user = await User.findOne({ keyid: userkey.sub });

    const _conversation = await Conversation
      .find({ convarsitionid: conversationid, userid: user._id, status: CONSTANT.active, delete: false })
      .populate("messages")
      .populate("questionAnswers")
      .populate("behaviors")

    if (_conversation.length == 0) return res.status(400).json(ApiResponse.error(400, "Konuşmaya ulaşılamıyor ", { message: "konuşmaya ulaşılamıyor" }));

    // **6️⃣ Kullanıcı bilgilerini ve token’ları döndür**
    return res.status(200).json(ApiResponse.success(200, "Konuşma detayı",
      {
        message: "Konuşma detayı",
        _conversation,
      }));

  } catch (error) {
    console.error("Login Error:", error.response?.data || error);
    return res.status(500).json(ApiResponse.error(500, "Kullanıcı bilgileri hatası: " + error.message, { message: "Sunucu hatası, lütfen tekrar deneyin" }));
  }
});

//privete public
const historyies = asyncHandler(async (req, res) => {
  const access_token = req.kauth.grant.access_token.token;
  const userkey = await Keycloak.getUserInfo(access_token);
  const user = await User.findOne({ keyid: userkey.sub });
  try {
    const _conversation = await Conversation.find({ userid: user._id, status: CONSTANT.active, delete: false })

    const historyies = _conversation.map((item) => {
      return {
        conversationid: item.conversationid,
        title: item.title
      }
    })

    // **6️⃣ Kullanıcı bilgilerini ve token’ları döndür**
    return res.status(200).json(ApiResponse.success(200, "Konuşma geçmişi",
      {
        message: "Konuşma geçmişi",
        historyies,
      }));

  } catch (error) {
    console.error("Login Error:", error.response?.data || error);
    return res.status(500).json(ApiResponse.error(500, "Kullanıcı bilgileri hatası: " + error.message, { message: "Sunucu hatası, lütfen tekrar deneyin" }));
  }
});
module.exports = {
  create, conversation, historyies, detail
};
