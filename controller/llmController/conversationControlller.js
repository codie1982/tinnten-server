//General Library
const asyncHandler = require("express-async-handler");
const axios = require("axios");
const { v4: uuidv4 } = require('uuid');

const LLMAgent = require("../../llm/agents/llmAgent.js")

//helper
const ApiResponse = require("../../helpers/response.js")
const User = require("../../mongoModels/userModel.js")
const UserProfil = require("../../mongoModels/userProfilModel.js")
const Conversation = require("../../models/Conversation")
const ConversationModel = require("../../mongoModels/conversationModel.js");
const ConversationDB = require("../../db/ConversationMongoDB.js");
const Message = require("../../db/ConversationMongoDB.js")
const MessageModel = require("../../mongoModels/messageModel.js");


const MODEL1 = "gpt-3.5-turbo"
const MODEL2 = "gpt-4o"
const Keycloak = require("../../lib/Keycloak.js");




const SummarizeAgent = require("../../llm/agents/memoryAgent.js");
const MemoryManager = require("../../llm/memory/MemoryManager.js");
const { MessageFactory } = require("../../lib/message/MessageProcessor.js");
const ConversationMongoDB = require("../../db/ConversationMongoDB.js");
const QuestionDB = require("../../db/QuestionDB.js");





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
  console.log("[Conversation] Request received with body:", req.body)
  let { conversationid, human_message, answers } = req.body;
  let conversationCreated = false;
  let LLM;

  try {
    LLM = new LLMAgent();
    await LLM.start(MODEL2, 0.2);
    console.log("LLM started successfully");
  } catch (error) {
    console.error("LLM connection error:", error);
    return res.status(500).json(ApiResponse.error(500, "LLM hatası", {
      message: "LLM bağlantısı kurulamıyor."
    }));
  }

  // Kullanıcı yetkilendirme
  const access_token = req.kauth?.grant?.access_token?.token;
  if (!access_token) {
    console.warn("Access token not found or invalid");
    return res.status(401).json(ApiResponse.error(401, "Yetkilendirme hatası", {
      message: "Token bulunamadı veya geçersiz."
    }));
  }

  const userkey = await Keycloak.getUserInfo(access_token);
  const user = await User.findOne({ keyid: userkey.sub });
  console.log("[Conversation] User validated:", user?._id)

  if (!user) {
    console.warn("User not found for keyid:", userkey.sub);
    return res.status(404).json(ApiResponse.error(404, "Kullanıcı bulunamadı", {
      message: "Geçersiz kullanıcı."
    }));
  }

  const userid = user._id;
  const dbCon = new ConversationDB();
  let messageIds = [];

  try {
    let conversation = null;

    // Eğer `conversationid` varsa eski konuşmayı getir
    if (conversationid) {
      const readConversation = await dbCon.read({ userid, conversationid });
      if (!readConversation) {
        console.warn("Invalid conversationid:", conversationid);
        return res.status(400).json(ApiResponse.error(400, "Geçersiz conversationid", {
          message: "Belirtilen conversationid bulunamadı."
        }));
      }
      conversation = new Conversation(readConversation);
      console.log("[Conversation] Existing conversation found:", conversationid);
    } else {
      console.warn("[Conversation] conversationid is missing");
      return res.status(400).json(ApiResponse.error(400, "conversationid eksik", {
        message: "Lütfen geçerli bir conversationid gönderin."
      }));
    }

    // **Mesaj bloğu boş olamaz**
    if (!human_message || human_message.trim() === "") {
      console.warn("[Conversation] Empty human message");
      return res.status(400).json(ApiResponse.error(400, "Mesaj bloğu boş olamaz", {
        message: "Lütfen bir mesaj girin."
      }));
    }

    console.log("[Conversation] Retrieving LLM orientation context...");
    const context = await LLM.getOrientationContext(userkey, conversation, human_message);
    console.log("context", context);
    console.log("context", context.content.products)
    console.log("[Conversation] Received context with finish_reason:", context.finish_reason);
    if (!context || context.finish_reason !== "stop") {
      console.error("[Conversation] LLM process incomplete");
      return res.status(500).json(ApiResponse.error(500, "Konuşma iptal edildi", {
        message: "LLM işlemi tamamlanamadı."
      }));
    }

    // **Kullanıcının mesajını oluştur**
    let messageGroupid = uuidv4();
    console.log("[Conversation] Generated messageGroupid:", messageGroupid);

    const humanMessage = MessageFactory.createMessage("human_message", messageGroupid, human_message);
    let nHumanMessage = await humanMessage.saveToDatabase();
    console.log("[Conversation] Human message saved with id:", nHumanMessage._id);

    const systemMessage = MessageFactory.createMessage("system_message", messageGroupid, null, context);
    let nSystemMessage = await systemMessage.processAndSave();
    console.log("[Conversation] System message saved with id:", nSystemMessage._id);

    messageIds.push(nHumanMessage._id, nSystemMessage._id);
    // **Mesajları Konuşmaya Ekle**
    if (messageIds.length > 0) {
      await dbCon.update(
        { userid, conversationid },
        { messages: messageIds } // Otomatik olarak `$push` kullanacak
      );

      console.log("[Conversation] Messages added to conversation:");
    }

    let isMemorySaved = false;
    if (context.content.includeInContext) {
      console.log("[Conversation] Saving memory for conversation...");

      // Retrieve the current state of the conversation
      let tempConversation = new Conversation(await dbCon.read({ userid, conversationid }));
      console.log("[Conversation] Current conversation state retrieved:", tempConversation);

      // Initialize MemoryManager and load the conversation memory
      let memoryManager = new MemoryManager();
      memoryManager.loadMemory(tempConversation);
      console.log("[Conversation] Memory loaded into MemoryManager");

      // Get summarized memory for the conversation
      let conversationSummary = await memoryManager.getSummarizedForMemory();
      console.log("[Conversation] Conversation summary generated:", conversationSummary);

      // Update the conversation with the summarized memory
      await dbCon.update(
        { userid, conversationid },
        { memory: conversationSummary.content }
      );
      isMemorySaved = true;
      console.log("[Conversation] Memory saved for conversation:", conversationid);
    }

    // **Güncellenmiş Konuşmayı Oku ve Yanıt Gönder**
    const newConversation = await dbCon.read({ userid, conversationid });
    console.log("[Conversation] Updated conversation retrieved:");

    return res.status(200).json(ApiResponse.success(200, "Konuşma başarıyla oluşturuldu!", {
      success: true,
      isMemorySaved,
      conversation: newConversation
    }));

  } catch (error) {
    console.error("[Conversation] Error occurred:", error);
    return res.status(500).json(ApiResponse.error(500, "Sunucu hatası", {
      success: false,
      message: "Konuşma oluşturulurken hata oluştu.",
      error: error.message
    }));
  }
});
const answer = asyncHandler(async (req, res) => {
  const { id, answer } = req.body;
  const questionid = id;
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

  try {
    const questionDB = new QuestionDB()
    const _question = await questionDB.update({ _id: questionid }, { answer })
    if (_question) {
      return res.status(200).json(ApiResponse.success(200, "cevap kayıt edildi", {
        success: true,
        message: "cevap kayıt edildi!",
        question: _question
      }));
    }

  } catch (error) {
    console.error("cevap kayıt edilemedi:", error);
    return res.status(500).json(ApiResponse.error(500, "", {
      success: false,
      message: "cevap kayıt edilemedi.",
      error: error.message
    }));
  }
});
const deleteQuestion = asyncHandler(async (req, res) => {
  const { id } = req.body;
  const questionid = id;
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

  try {
    const questionDB = new QuestionDB()
    const _question = await questionDB.update({ _id: questionid }, { delete: true })
    if (_question) {
      return res.status(200).json(ApiResponse.success(200, "mesaj başarı ile silindi", {
        success: true,
        message: "mesaj başarı ile silindi!",
        deleteid: questionid
      }));
    }

  } catch (error) {
    console.error("Soru silinmedi:", error);
    return res.status(500).json(ApiResponse.error(500, "", {
      success: false,
      message: "cevap kayıt edilemedi.",
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

  try {
    // Benzersiz bir conversationid oluştur


    // **Yeni konuşma başlat**
    let nConversation = new Conversation();
    let conversationid = uuidv4()
    nConversation.setConversationId(conversationid)
    nConversation.setUserId(userid)
    const conversation = await new ConversationDB().create(nConversation)
    // Konuşmayı kaydet
    if (conversation) {
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
    let userid = user._id
    console.log("userid", userid)
    console.log("conversationid", conversationid)
    const conDb = new ConversationDB()
    // 🗂 **Konuşmayı Veri Tabanından Getir**
    const _conversation = await conDb.read({ userid, conversationid })

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
    const conDb = new ConversationDB()
    const _conversation = await conDb.readMany({ userid: user._id, status: CONSTANT.active, delete: false })
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
  create, conversation, historyies, detail, answer, deleteQuestion
};




/*
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
    */