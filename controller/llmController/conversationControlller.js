//General Library
const asyncHandler = require("express-async-handler");
const axios = require("axios");
const { v4: uuidv4 } = require('uuid');

const LLMAgent = require("../../llm/agents/llmAgent.js")
//LLM import
const {
  AIMessage,
  HumanMessage,
  SystemMessage,
  trimMessages,
} = require("@langchain/core/messages");

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
const DynamicForm = require("../../models/dynamicFormModel.js")
const FormField = require("../../models/formFieldModel.js")
const FromResponse = require("../../models/formResponseSchema.js")

const MODEL1 = "gpt-3.5-turbo"
const MODEL2 = "gpt-4o"
const Keycloak = require("../../lib/Keycloak.js");
const { model } = require("mongoose");

const SummarizeAgent = require("../../llm/agents/summarizeAgent.js");


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
  const { conversationid, human_message, answers } = req.body;
  let { title } = req.body;

  //"gpt-3.5-turbo"
  let conversationCreated = false
  let LLM;
  try {

    LLM = new LLMAgent()
    await LLM.start(MODEL2, 0.2)
  } catch (error) {
    return res.status(500).json(ApiResponse.error(500, "LLM hatası", { message: "LLM bağlantısı kurulamıyor." }));

  }

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



  const userid = user._id;
  let nConversation = null;
  // **Mesajları ekle**
  let messageIds = [];
  let messageGroupid = uuidv4()

  try {
    // 🔍 **Eğer `conversationid` varsa eski konuşmayı getir**
    if (conversationid) {

      nConversation = await Conversation.findOne({
        conversationid,
        userid,
        status: CONSTANT.active,
        delete: false
      })
        .populate("messages");;

      if (!nConversation) {
        return res.status(500).json(ApiResponse.error(400, "conversionid'si geçersiz", { message: "conversionid'si geçersiz." }));
      }
      conversationCreated = false;
    } else {

      // **Başlığı belirle**
      if (title) title = title.trim().normalize("NFKD").toLowerCase();
      // **Yeni konuşma başlat**
      nConversation = new Conversation({
        conversationid: uuidv4(),
        userid,
        title,
        messages: []
      });
      await nConversation.save();
      conversationCreated = true;
    }
    if (conversationCreated)
      if (!human_message || human_message.trim() === "") {
        return res.status(400).json(ApiResponse.error(400, "Mesaj bloğu boş olamaz", { message: "Lütfen bir mesaj girin." }));
      }



    let QnA = [];
    if (answers && answers.length > 0) {


      for (let i = 0; i < answers.length; i++) {
        let questionid = answers[i].id;
        await Question.findOneAndUpdate({ _id: questionid }, { answer: answers[i].a });
        let nQuestion = await Question.findOne({ _id: questionid });

        if (nQuestion) {
          QnA.push({ q: nQuestion.questionText, a: answers[i].a });
        }
      }
    }


    const context = await LLM.getOrientationContext(conversationid ? nConversation.messages != 0 ? nConversation.messages : [] : [],
      human_message, nConversation.context, QnA)

    if (context.finish_reason != "stop") {
      return res.status(500).json(ApiResponse.error(400, "konuşma iptal oldu", { message: "konuşma iptal oldu." }));
    }
    let systemMessage;
    if (context.uncertainty_level == "high") {
      //istek de belirsizlik var ise sorular ile kullanıcıdan daha fazla bilgi almaya çalşıyoruz.absolute
      let productionQuestionsIds = []
      let servicesQuestionsIds = []
      let productionQuestions = context.content.products?.question //ürünler için sorular

      if (context.content.request_type == "product" || context.content.request_type == "both") {

        if (productionQuestions.length != 0) {
          for (let i = 0; productionQuestions.length; i++) {
            let _questions = new Question({
              conversationid: nConversation._id,
              questionText: productionQuestions.q,  // LLM'in sorduğu soru
              important: productionQuestions.important,// {type:String,enum:["high","low"]},
              input_type: productionQuestions.input_type,
              options: productionQuestions.options,
            })

            const nQuestion = await _questions.save()
            productionQuestionsIds.push(nQuestion._id)
          }
        }
      }
      if (context.content.request_type == "service" || context.content.request_type == "both") {
        let servicesQuestions = context.content.services?.question //Hizmetler için sorular

        if (servicesQuestionsIds.length != 0) {
          for (let i = 0; servicesQuestions.length; i++) {
            let _questions = new Question({
              conversationid: nConversation._id,
              questionText: servicesQuestions.q,  // LLM'in sorduğu soru
              important: servicesQuestions.important,// {type:String,enum:["high","low"]},
              input_type: servicesQuestions.input_type,
              options: servicesQuestions.options,
            })

            const nQuestion = await _questions.save()
            servicesQuestionsIds.push(nQuestion._id)
          }
        }
      }



      systemMessage = new Message({
        type: "system_message", // Mesaj türü
        groupid: messageGroupid,
        content: context.system_message,  // Mesaj içeriği
        intent: context.context, // LLM niyet analizi
        search_context: context.product.pro.search_context, // LLM niyet analizi
        productionQuestions: productionQuestionsIds, // LLM'in sorduğu sorunun ID'si
        servicesQuestions: servicesQuestionsIds, // LLM'in sorduğu sorunun ID'si
        finish_reason: context.finish_reason,
        systemData: {},
      });


      /**
       *  conversation_usage: {
          tokens: {
            prompt_tokens: context.tokens.prompt_tokens,
            completion_tokens: context.tokens.completion_tokens,
            total_tokens: context.tokens.total_tokens,
          },
          cost: {
            prompt_cost: context.cost.promptCost,
            completion_cost: context.cost.completionCost,
            total_cost: context.cost.totalCost,
            unit: "DL"
          }

        }
       */

      //Usage hesaplanması gerekiyor.

    } else if (context.uncertainty_level == "low") {
      //tahminlenen ürünve hizmetler için yakınsama araması yapılacak.

      //ürün ve hizmetler için bir embedding oluşturulacak. ilgili filtreler için de embeddin oluşturulacak
      //ve dbde olan ürünler ve  filtreler ile birlikte kullanıcıya önerilerde bulunulacak. 
      //tahmini ürünlerin listesi ve ürün groupları
      let products = context.content.products
      //genel olarak kategoriler
      let general_categories = context.content.general_categories
      //Kullanıcının bağlamı
      //yapılması gereken eylem
      let action = context.content.action
      //token miktarı
      let tokens = context.tokens
      //modele göre dolar cinsinden maliyet 
      let cost = context.cost

      systemMessage = new Message({
        type: "system_message", // Mesaj türü
        groupid: messageGroupid,
        content: context.system_message,  // Mesaj içeriği
        intent: context.context, // LLM niyet analizi
        search_context: context.search_context, // LLM niyet analizi
        questions: [], // LLM'in sorduğu sorunun ID'si
        finish_reason: "",
        systemData: {},

      });

    } else {
      console.log("context,", context)
      systemMessage = new Message({
        type: "system_message", // Mesaj türü
        groupid: messageGroupid,
        content: context.content.system_message,  // Mesaj içeriği
        intent: context.context, // LLM niyet analizi
        search_context: context.search_context, // LLM niyet analizi
        questions: [],
        finish_reason: context.finish_reason,
        systemData: {},
      });
    }

    //konuşmanın özeti

    // **Kullanıcının mesajını oluştur**
    const humanMessage = new Message({
      type: "human_message",
      groupid: messageGroupid,
      content: human_message == null ? "" : human_message,
    });
    console.log("humanMessage", humanMessage)
    console.log("systemMessage", systemMessage)
    const insertedMessages = await Message.insertMany([humanMessage, systemMessage]);
    if (!insertedMessages || insertedMessages.length === 0) {
      throw new Error("Mesajlar veritabanına eklenemedi.");
    }



    messageIds.push(humanMessage._id, systemMessage._id);
    // **Mesajları Konuşmaya Ekle**
    if (messageIds.length > 0) {
      const newConversation = await Conversation.findOneAndUpdate(
        { conversationid: nConversation.conversationid },
        { $push: { messages: { $each: messageIds } }, context: "" },
        { new: true }
      );
    }




    // **Konuşmayı populate ile tekrar yükle**
    nConversation = await Conversation.findOne({ conversationid: nConversation.conversationid })
      .populate({
        path: "messages",
        populate: [
          { path: "systemData.recommendations", model: "recommendation" }, // ✅ Model ismi büyük harfle başlamalı
          { path: "productionQuestions", model: "question" }, // Mesajlar altındaki questions alanını populate et
          { path: "servicesQuestions", model: "question" } // Mesajlar altındaki questions alanını populate et
        ]
      })
      .populate("behaviors") // Kullanıcı davranışları

    if (nConversation) {
      console.log("-----ENSON-----")
      console.log("context", context)
      console.log("nConversation.messages", nConversation.messages)

      let isSummiraize = false;
      if (context.content.includeInContext) {
        let userContext = context.content.context
        let userbehavior = context.content.userBehaviorModel
        const summarize = await new SummarizeAgent()
        const conversationSummarize = await summarize.getSummarize(nConversation.messages, userbehavior, userContext)
        await nConversation.findOneAndUpdate({ conversationid: nConversation.conversationid }, { summarize: conversationSummarize.content })
        isSummiraize=true;
      }


      return res.status(200).json(ApiResponse.success(200, "", {
        success: true,
        message: "Konuşma başarıyla oluşturuldu!",
        summarize:isSummiraize,
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
