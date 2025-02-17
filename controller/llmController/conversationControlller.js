//General Library
const asyncHandler = require("express-async-handler");
const axios = require("axios");
const { v4: uuidv4 } = require('uuid');




//helper
const ApiResponse = require("../../helpers/response.js")
const User = require("../../models/userModel.js")
const Conversation = require("../../models/conversationModel.js");
const Message = require("../../models/messageModel.js");
const Recommendation = require("../../models/recommendationModel.js")
const Question = require("../../models/questionModel.js")
const Answer = require("../../models/answerModel.js")
const Behaviors = require("../../models/userBehaviorModel.js");
const Questions = require("../../models/questionModel.js");




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
  const { conversationid, human_message } = req.body;
  let { title } = req.body;

  // Kullanıcı yetkilendirme
  const access_token = req.kauth?.grant?.access_token?.token;
  if (!access_token) {
    return res.status(401).json(ApiResponse.error(401, "Yetkilendirme hatası", { message: "Token bulunamadı veya geçersiz." }));
  }

  const userkey = await Keycloak.getUserInfo(access_token);
  const user = await User.findOne({ keyid: userkey.sub });

  if (!user) {
    return res.status(404).json(ApiResponse.error(404, "Kullanıcı bulunamadı", { message: "Geçersiz kullanıcı." }));
  }

  if (!human_message || human_message.trim() === "") {
    return res.status(400).json(ApiResponse.error(400, "Mesaj bloğu boş olamaz", { message: "Lütfen bir mesaj girin." }));
  }

  const userid = user._id;
  let nConversation = null;

  try {
    // 🔍 **Eğer `conversationid` varsa eski konuşmayı getir**
    if (conversationid) {
      nConversation = await Conversation.findOne({
        conversationid,
        userid,
        status: CONSTANT.active,
        delete: false
      });

    } else {
      // **Başlığı belirle**
      if (!title) {
        title = human_message.substring(0, 30) + "..."; // İlk 30 karakter + '...' ekleniyor
      }
      if (title) {
        title = title.trim().normalize("NFKD").toLowerCase();
      }

      // **Aynı kullanıcı için aynı başlığa sahip konuşma olup olmadığını kontrol et**
      const oldCnnv = await Conversation.findOne({
        userid,
        title: title || "",
        status: CONSTANT.active,
        delete: false
      });

      if (oldCnnv) {
        // Kullanıcı için aynı başlık varsa, hata döndürme, mevcut konuşmayı döndür.
        return res.status(200).json(ApiResponse.success(200, "", {
          success: true,
          message: "Mevcut konuşma getirildi.",
          conversation: oldCnnv
        }));
      }

      // **Yeni konuşma başlat**
      nConversation = new Conversation({
        conversationid: uuidv4(),
        userid,
        title,
        messages: []
      });

      await nConversation.save();
    }

    // **Mesajları ekle**
    let messageIds = [];
    let groupid = uuidv4()
    if (human_message) {
      // **Kullanıcının mesajını oluştur**
      const humanMessage = new Message({
        type: "human_message",
        groupid,
        content: human_message,
      });

      // **LLM’in mesajını oluştur**
      //const llmResponse = await getLLMResponse(human_message); // LLM cevabı
      const llmResponse = "Sistem mesajı"
      const systemMessage = new Message({
        type: "system_message",
        groupid,
        content: llmResponse || "Lütfen tekrar deneyin."
      });

      const insertedMessages = await Message.insertMany([humanMessage, systemMessage]);
      if (!insertedMessages || insertedMessages.length === 0) {
        throw new Error("Mesajlar veritabanına eklenemedi.");
      }

      messageIds.push(humanMessage._id, systemMessage._id);
    }

    // **Mesajları Konuşmaya Ekle**
    if (messageIds.length > 0) {
      await Conversation.findOneAndUpdate(
        { conversationid: nConversation.conversationid },
        { $push: { messages: { $each: messageIds } } }
      );
    }

    // **Konuşmayı populate ile tekrar yükle**
    nConversation = await Conversation.findOne({ conversationid: nConversation.conversationid })
      .populate({
        path: "messages",
        populate: [
          { path: "systemData.recommendations", model: "recommendation" } // ✅ Model ismi büyük harfle başlamalı
        ]
      })
      .populate("behaviors") // Kullanıcı davranışları
      .populate({
        path: "questions",
        populate: {
          path: "questionid",
          model: "question"
        }
      });

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

  // Başlığı normalize et ve temizle
  if (title && typeof title === "string") {
    title = title.trim().normalize("NFKD").toLowerCase();
  }
  try {
    // Aynı kullanıcı için aynı başlığa sahip konuşma olup olmadığını kontrol et
    const oldCnnv = await Conversation.findOne({
      userid,
      title: title,
      status: CONSTANT.active,
      delete: false
    });

    if (oldCnnv) {
      return res.status(400).json(ApiResponse.error(400, "Konuşma başlığı daha önce girilmiş", { message: "Bu başlıkla zaten bir konuşma mevcut" }));
    }

    // Benzersiz bir conversationid oluştur
    let conversationid;
    do {
      conversationid = uuidv4();
    } while (await Conversation.exists({ conversationid }));

    // Yeni konuşma nesnesini oluştur
    const _conversation = new Conversation({
      conversationid,
      userid,
      title: title || "",
      messages: [],
      context: typeof systemContext === "function" ? systemContext() : "",
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

  if (!conversationid) {
    return res.status(400).json(ApiResponse.error(400, "Konuşma ID eksik", { message: "Geçerli bir konuşma ID'si sağlamalısınız" }));
  }

  try {
    // 🔑 **Kullanıcı Yetkilendirme Kontrolü**
    const access_token = req.kauth?.grant?.access_token?.token;
    if (!access_token) {
      return res.status(401).json(ApiResponse.error(401, "Yetkilendirme hatası", { message: "Token bulunamadı veya geçersiz." }));
    }

    const userkey = await Keycloak.getUserInfo(access_token);
    const user = await User.findOne({ keyid: userkey.sub });

    if (!user) {
      return res.status(404).json(ApiResponse.error(404, "Kullanıcı bulunamadı", { message: "Geçersiz kullanıcı." }));
    }

    // 🗂 **Konuşmayı Veri Tabanından Getir**
    const _conversation = await Conversation
      .findOne({ conversationid: conversationid, userid: user._id, status: CONSTANT.active, delete: false }) // ✅ Yanlış olan `convarsitionid` düzeltildi
      .populate({
        path: "messages",
        populate: [
          { path: "systemData.recommendations", model: "recommendation" } // ✅ Model ismi büyük harfle başlamalı
        ]
      })
      .populate("behaviors") // Kullanıcı davranışları
      .populate({
        path: "questions",
        populate: {
          path: "questionid",
          model: "question"
        }
      });

    // 🚨 **Hatalı veya Geçersiz Konuşma Kontrolü**
    if (!_conversation) {
      return res.status(404).json(ApiResponse.error(404, "Konuşmaya ulaşılamıyor", { message: "Bu konuşma mevcut değil veya yetkiniz yok." }));
    }

    // 🆗 **Başarıyla Konuşmayı Döndür**
    return res.status(200).json(ApiResponse.success(200, "Konuşma detayı", {
      message: "Konuşma detayı",
      conversation: _conversation, // ✅ JSON formatında göndermek için değişken adı düzeltildi
    }));

  } catch (error) {
    console.error("Conversation Detail Error:", error.message);
    return res.status(500).json(ApiResponse.error(500, "Sunucu hatası", { message: "Sunucu hatası, lütfen tekrar deneyin" }));
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
