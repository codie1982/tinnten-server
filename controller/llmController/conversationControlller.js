//General Library
const asyncHandler = require("express-async-handler");
const axios = require("axios");
const { v4: uuidv4 } = require('uuid');

const IntentAgent = require("../../llm/agents/intentAgent.js")

//helper
const ApiResponse = require("../../helpers/response.js")
const User = require("../../mongoModels/userModel.js")
const UserProfil = require("../../mongoModels/userProfilModel.js")
const Conversation = require("../../models/Conversation")
const ConversationDB = require("../../db/ConversationMongoDB.js");
const MessageDB = require("../../db/MessageDB.js");
const MODEL1 = "gpt-3.5-turbo"
const MODEL2 = "gpt-4o"
const Keycloak = require("../../lib/Keycloak.js");
const ConversationService = require("../../lib/ConversationService.js");
const MemoryManager = require("../../llm/memory/MemoryManager.js");
const { MessageFactory } = require("../../lib/message/MessageProcessor.js");
const QuestionDB = require("../../db/QuestionDB.js");
const CONSTANT = { active: "active" }
const RecommendationProcessorFactory = require("../../lib/processor/RecommendationProcessorFactory.js");
const InformationProcessorFactory = require("../../lib/processor/InformationProcessorFactory.js");



const RecommendationAgent = require("../../llm/agents/recommendationAgent.js")
const ChatResponseAgent = require("../../llm/agents/chatResponseAgent.js")
const InformationResponseAgent = require("../../llm/agents/informationResponseAgent.js")
const RecomResponseAgent = require("../../llm/agents/recomResponseAgent.js")
const ProducInfoResponseAgent = require("../../llm/agents/producInfoResponseAgent.js")
const server = require("../../server");
const RecomAgent = require("../../llm/agents/recomAgent.js");
const RecommendationDB = require("../../db/RecommendationDB.js");
//privete public
// @route   POST /api/conversation
// @desc    Yeni bir konuşma başlatır veya mevcut bir konuşmayı günceller
// @access  Private
const conversation = asyncHandler(async (req, res) => {
  try {
    console.log("💬 [Conversation] Yeni istek alındı:", req.body);

    const { conversationid, human_message, productid, servicesid } = req.body;
    const access_token = req.kauth?.grant?.access_token?.token;

    // 🛡️ Yetkilendirme
    if (!access_token) {
      return res.status(401).json(ApiResponse.error(401, "Yetkilendirme hatası", {
        message: "Token bulunamadı veya geçersiz."
      }));
    }

    const userkey = await Keycloak.getUserInfo(access_token);
    const user = await User.findOne({ keyid: userkey.sub });
    if (!user) {
      return res.status(404).json(ApiResponse.error(404, "Kullanıcı bulunamadı"));
    }

    const userid = user._id;
    const dbCon = new ConversationDB();
    const messageIds = [];

    // 📁 Konuşma kontrolü
    if (!conversationid) {
      return res.status(400).json(ApiResponse.error(400, "conversationid eksik"));
    }

    const conversationDetail = await dbCon.read({ userid, conversationid });
    if (!conversationDetail) {
      return res.status(400).json(ApiResponse.error(400, "Geçersiz conversationid"));
    }

    const conversation = new Conversation(conversationDetail);
    if (conversation.messages.length === 0 && (!human_message || human_message.trim() === "")) {
      return res.status(400).json(ApiResponse.error(400, "Mesaj bloğu boş olamaz"));
    }

    // IntentAgent ile niyet belirleme
    const intentAgent = new IntentAgent();
    await intentAgent.start(MODEL1, 0.2); // MODEL1 varsayılan
                                              //user, humanMessage, memory = [], scoped = {}
    const intent = await intentAgent.getIntent(userkey, human_message,); // Sadece intent döner (ör. "chat")
    console.log("🎯 [Intent] Belirlenen niyet:", intent);

    const messageGroupid = uuidv4();
    let context = null;
    let preHuman, preAssistant;
    let system_message_parent_id = "";

    // ⚙️ Intent'e göre işlem
    switch (intent) {
      case "recommendation":
        const recomAgent = new RecomAgent();
        await recomAgent.start(MODEL2, 0.2);
        console.log("[recomAgent] RecomAgent started successfully");
        let recomContext = await recomAgent.getRecommendation(userkey, conversationDetail, human_message)

        let processor = await RecommendationProcessorFactory.getRecommendationProcessor(recomContext, human_message);
        let recomResult = await processor.process();

        let recomid = recomResult.recomid

        // Recommendation Response (mevcut mantık korunuyor)
        preHuman = await MessageFactory
          .createMessage("human_message", userid, conversationid, intent, messageGroupid)
          .saveHumanMessage(human_message);

        let systemMessage = await MessageFactory
          .createMessage("system_message", userid, conversationid, intent, messageGroupid);


        await systemMessage.setRecommendations(recomResult.recomid);
        preAssistant = await systemMessage.saveSystemMessage(null, "");

        if (recomResult.type == "recommendation") {
          let recomDetail = await new RecommendationDB().read({ _id: recomid })
          preAssistant["recommendation"] = recomDetail
          const recomResponseAgent = new RecomResponseAgent();
          await recomResponseAgent.start(MODEL2, 0.2);

          let lastPreAssistant = await new MessageDB().read({ _id: preAssistant._id })
          console.log("[RecomResponseAgent] RecomResponseAgent started successfully");
          const mcpResponse = await recomResponseAgent.setRecomResponseContext(
            userkey,
            userid,
            conversationid,
            {
              human_message: preHuman, system_message: lastPreAssistant,
            },
            { products: recomResult.producsGroup, servces: recomResult.servicesGroup }
          );

          const assistantContent = mcpResponse.messages[0]?.content || "Yanıt oluşturulamadı";

          console.log("assistantContent", assistantContent)

          await MessageFactory.selectedMessage("system_message", userid, conversationid, intent, messageGroupid)
            .updateSystemMessage(preAssistant._id, null, assistantContent)

        } else if (recomResult.type == "question") {

          let lastPreAssistant = await new MessageDB().read({ _id: preAssistant._id })

          console.log("lastPreAssistant", JSON.stringify(lastPreAssistant))

          const recomResponseAgent = new RecomResponseAgent();
          await recomResponseAgent.start(MODEL2, 0.2);
          console.log("[RecomResponseAgent] RecomResponseAgent started successfully");
          const mcpResponse = await recomResponseAgent.setQuestionResponseContext(
            userkey,
            userid,
            conversationid,
            {
              human_message: preHuman, system_message: preAssistant,
            },
            { questions: lastPreAssistant.recommendation.questions }
          );

          const assistantContent = mcpResponse.messages[0]?.content || "Yanıt oluşturulamadı";

          console.log("assistantContent", assistantContent)

          await MessageFactory.selectedMessage("system_message", userid, conversationid, intent, messageGroupid)
            .updateSystemMessage(preAssistant._id, null, assistantContent)
        }



        break;

      case "services_info":
      case "chatabouthservices":
        console.log("selectedProductid", servicesid)
        let services = await InformationProcessorFactory
          .getInformationProcessor("services_info", servicesid, null,)
          .process();

        const servicesInformationResponseAgent = new InformationResponseAgent();
        await servicesInformationResponseAgent.start(MODEL2, 0.2);
        console.log("[InformationResponseAgent] InformationResponseAgent started successfully");

        //Yeni mesajı bilgilerini öncesinde oluştururm cliente iletelim. 
        //500ms bekleyelim. Sonra Stream'e başlasın. 
        // Extra bir response dönmemize gerek yok. 


        // Öncelikle Mesajları kaydet
        preHuman = await MessageFactory
          .createMessage("human_message", userid, conversationid, intent, messageGroupid)
          .saveHumanMessage(human_message);

        preAssistant = await MessageFactory
          .createMessage("system_message", userid, conversationid, intent, messageGroupid)
          .saveSystemMessage(null, "");

        const mcpServicesInfoResponse = await informationResponseAgent.setServicesInformationResponseContext(
          userkey,
          userid,
          conversationid,
          { human_message: preHuman, system_message: preAssistant },
          services
        );

        const assistantServicesInfoContent = mcpServicesInfoResponse.messages[0]?.content || "Yanıt oluşturulamadı";

        await MessageFactory.selectedMessage("system_message", userid, conversationid, intent, messageGroupid)
          .updateSystemMessage(preAssistant._id, null, assistantServicesInfoContent)
        break;

      case "production_info":
      case "chatabouthproduct":
        console.log("selectedProductid", productid)
        let product = await InformationProcessorFactory
          .getInformationProcessor("production_info", productid, null,)
          .process();

        const informationResponseAgent = new InformationResponseAgent();
        await informationResponseAgent.start(MODEL2, 0.2);
        console.log("[InformationResponseAgent] InformationResponseAgent started successfully");

        //Yeni mesajı bilgilerini öncesinde oluştururm cliente iletelim. 
        //500ms bekleyelim. Sonra Stream'e başlasın. 
        // Extra bir response dönmemize gerek yok. 


        // Öncelikle Mesajları kaydet
        preHuman = await MessageFactory
          .createMessage("human_message", userid, conversationid, intent, messageGroupid)
          .saveHumanMessage(human_message);

        preAssistant = await MessageFactory
          .createMessage("system_message", userid, conversationid, intent, messageGroupid)
          .saveSystemMessage(null, "");

        const mcpinfoResponse = await informationResponseAgent.setProductInformationResponseContext(
          userkey,
          userid,
          conversationid,
          { human_message: preHuman, system_message: preAssistant },
          product
        );

        const assistantinfoContent = mcpinfoResponse.messages[0]?.content || "Yanıt oluşturulamadı";

        await MessageFactory.selectedMessage("system_message", userid, conversationid, intent, messageGroupid)
          .updateSystemMessage(preAssistant._id, null, assistantinfoContent)
        break;

      case "chat":

        const chatResponseAgent = new ChatResponseAgent();
        await chatResponseAgent.start(MODEL2, 0.2);
        console.log("[Conversation] ChatResponseAgent started successfully");

        //Yeni mesajı bilgilerini öncesinde oluştururm cliente iletelim. 
        //500ms bekleyelim. Sonra Stream'e başlasın. 
        // Extra bir response dönmemize gerek yok. 


        // Öncelikle Mesajları kaydet
        preHuman = await MessageFactory
          .createMessage("human_message", userid, conversationid, intent, messageGroupid)
          .saveHumanMessage(human_message);

        preAssistant = await MessageFactory
          .createMessage("system_message", userid, conversationid, intent, messageGroupid)
          .saveSystemMessage(null, "");

        const mcpResponse = await chatResponseAgent.getChatResponseContext(
          userkey,
          userid,
          conversationid,
          { human_message: preHuman, system_message: preAssistant },
        );

        const assistantContent = mcpResponse.messages[0]?.content || "Yanıt oluşturulamadı";

        await MessageFactory.selectedMessage("system_message", userid, conversationid, intent, messageGroupid)
          .updateSystemMessage(preAssistant._id, null, assistantContent)

        break;
      default:
        return res.status(500).json(ApiResponse.error(500, "Bilinmeyen intent."));
    }

    // Konuşma güncelleme
    messageIds.push(preHuman._id, preAssistant._id);
    await dbCon.update({ userid, conversationid }, { messages: messageIds });

    // 🧠 Hafıza özeti
    let isMemorySaved = false;
    if (true) {
      const tempConv = new Conversation(await dbCon.read({ userid, conversationid }));
      const memoryManager = new MemoryManager();
      memoryManager.loadMemory(tempConv);

      const summary = await memoryManager.getSummarizedForMemory();
      await dbCon.update({ userid, conversationid }, { memory: summary.content });
      isMemorySaved = true;
    }

    // ✅ Yanıtla
    //const newConversation = await dbCon.read({ userid, conversationid });

    return res.status(200).json(ApiResponse.success(200, "Konuşma başarıyla oluşturuldu!", {
      success: true,
      isMemorySaved,
    }));

  } catch (error) {
    console.error("🔥 [Conversation] Hata:", error);
    return res.status(500).json(ApiResponse.error(500, "Sunucu hatası", {
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
    const conDb = new ConversationDB()
    // 🗂 **Konuşmayı Veri Tabanından Getir**
    const _conversation = await conDb.read({ userid, conversationid })
    // 🚨 **Hatalı veya Geçersiz Konuşma Kontrolü**
    if (!_conversation) {
      return res.status(404).json(ApiResponse.error(404, "Konuşmaya ulaşılamıyor", { message: "Bu konuşma mevcut değil veya yetkiniz yok." }));
    }

    // 🆗 **Başarıyla Konuşmayı Döndür**
    return res.status(200).json(ApiResponse.success(200, "Konuşma detayı", {
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
    // Retrieve page query parameter, default to page 1
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 5;
    const conDb = new ConversationDB();

    // Use readPaginated to get paged conversations.
    // Assume readPaginated returns an object with 'data' and 'totalCount'
    const historyList = await conDb.getHistoryList({ userid: user._id, status: CONSTANT.active, delete: false }, page, limit);
    const totalCount = await conDb.gettotalCount({ userid: user._id, status: CONSTANT.active, delete: false })

    return res.status(200).json(ApiResponse.success(200, "Konuşma geçmişi", {
      history: historyList,
      page,
      totalCount
    }));

  } catch (error) {
    console.error("Login Error:", error.response?.data || error);
    return res.status(500).json(ApiResponse.error(500, "Kullanıcı bilgileri hatası: " + error.message, { message: "Sunucu hatası, lütfen tekrar deneyin" }));
  }
});

const deleteConversation = asyncHandler(async (req, res) => {
  const access_token = req.kauth.grant.access_token.token;
  const userkey = await Keycloak.getUserInfo(access_token);
  const user = await User.findOne({ keyid: userkey.sub });
  const { conversationid } = req.query;
  try {
    const conDb = new ConversationDB();
    // Use readPaginated to get paged conversations.
    const findConversation = await conDb.findOne({ userid: user._id, status: CONSTANT.active, delete: false, conversationid })
    if (!findConversation) {
      return res.status(404).json(ApiResponse.error(404, "Konuşma bulunamadı", { message: "Bu konuşma mevcut değil veya yetkiniz yok." }));
    }
    // Silme işlemi
    await conDb.delete({ userid: user._id, status: CONSTANT.active, delete: false, conversationid });

    return res.status(200).json(ApiResponse.success(200, "Konuşma Silindi", {
      conversationid,
    }));

  } catch (error) {
    console.error("Login Error:", error.response?.data || error);
    return res.status(500).json(ApiResponse.error(500, "Kullanıcı bilgileri hatası: " + error.message, { message: "Sunucu hatası, lütfen tekrar deneyin" }));
  }
});

const updateTitle = asyncHandler(async (req, res) => {
  const access_token = req.kauth.grant.access_token.token;
  const userkey = await Keycloak.getUserInfo(access_token);
  const user = await User.findOne({ keyid: userkey.sub });
  const { title, conversationid } = req.body;
  try {
    const conDb = new ConversationDB();
    // 
    const findConversation = await conDb.findOne({ userid: user._id, status: CONSTANT.active, delete: false, conversationid })
    if (!findConversation) {
      return res.status(404).json(ApiResponse.error(404, "Konuşma bulunamadı", { message: "Bu konuşma mevcut değil veya yetkiniz yok." }));
    }
    await conDb.update({ userid: user._id, status: CONSTANT.active, delete: false, conversationid }, { title });
    return res.status(200).json(ApiResponse.success(200, "Konuşma başlığı düzenlendi", {
      title, conversationid
    }));

  } catch (error) {
    console.error("Login Error:", error.response?.data || error);
    return res.status(500).json(ApiResponse.error(500, "Kullanıcı bilgileri hatası: " + error.message, { message: "Sunucu hatası, lütfen tekrar deneyin" }));
  }
});

const search = asyncHandler(async (req, res) => {
  const searchText = req.query.q;
  const page = Math.max(1, parseInt(req.query.p) || 1);
  const limit = Math.max(1, parseInt(req.query.l) || 10);

  if (!searchText) {
    return res.status(400).json(ApiResponse.error(400, "Arama metni eksik", { message: "Geçerli bir arama metni sağlamalısınız" }));
  }
  const access_token = req.kauth.grant.access_token.token;
  const userkey = await Keycloak.getUserInfo(access_token);
  const user = await User.findOne({ keyid: userkey.sub });

  if (!user) {
    return res.status(404).json(ApiResponse.error(404, "Kullanıcı bulunamadı", { message: "Geçersiz kullanıcı" }));
  }
  const userid = user._id;

  try {
    // Benzersiz bir conversationid oluştur

    const findConversationList = await new MessageDB().search(userid, searchText, page, limit);
    // Konuşmayı kaydet
    if (findConversationList) {
      return res.status(200).json(ApiResponse.success(200, "mesajlar bulundu", {
        results: findConversationList,
      }));
    } else {
      return res.status(500).json(ApiResponse.error(500, "Konuşma başlatılamadı", { message: "Konuşma oluşturulurken bir hata oluştu" }));
    }
  } catch (error) {
    console.error("Login Error:", error.response?.data || error);
    return res.status(500).json(ApiResponse.error(500, "Kullanıcı bilgileri hatası: " + error.message, { message: "Sunucu hatası, lütfen tekrar deneyin" }));
  }
});



module.exports = {
  create, conversation, deleteConversation, updateTitle, historyies, detail, answer, deleteQuestion, search
};



/**
 * const conversation = asyncHandler(async (req, res) => {
  try {
    console.log("💬 [Conversation] Yeni istek alındı:", req.body);

    const { conversationid, human_message, messageid, productid, servicesid } = req.body;
    const access_token = req.kauth?.grant?.access_token?.token;

    // 🛡️ Yetkilendirme
    if (!access_token) {
      return res.status(401).json(ApiResponse.error(401, "Yetkilendirme hatası", {
        message: "Token bulunamadı veya geçersiz."
      }));
    }

    const userkey = await Keycloak.getUserInfo(access_token);
    const user = await User.findOne({ keyid: userkey.sub });
    if (!user) {
      return res.status(404).json(ApiResponse.error(404, "Kullanıcı bulunamadı"));
    }

    const userid = user._id;
    const io = getIO();
    const dbCon = new ConversationDB();
    const messageIds = [];

    // 📁 Konuşma kontrolü
    if (!conversationid) {
      return res.status(400).json(ApiResponse.error(400, "conversationid eksik"));
    }

    const existing = await dbCon.read({ userid, conversationid });
    if (!existing) {
      return res.status(400).json(ApiResponse.error(400, "Geçersiz conversationid"));
    }

    const conversation = new Conversation(existing);
    if (conversation.messages.length === 0 && (!human_message || human_message.trim() === "")) {
      return res.status(400).json(ApiResponse.error(400, "Mesaj bloğu boş olamaz"));
    }

    const intentAgent = new IntentAgent();
    await intentAgent.start(MODEL1, 0.2);
    const userIntent = await intentAgent.getIntent(userkey, human_message);
    console.log("userIntent", userIntent)
    const intent = userIntent.content.intent;
    console.log("🎯 [Intent] Belirlenen niyet:", intent);

    const messageGroupid = uuidv4();
    let context = null;
    let system_message;
    let system_message_parent_id;
    let savedHuman, savedSystem;
    const conversationServices = new ConversationService(userkey, userid, conversationid, human_message);

    // ⚙️ Intent'e göre işlem
    switch (intent) {
      case "recommendation":

        context = await conversationServices.createRecommendationContext(intent);
        if (!context || context.finish_reason !== "stop") {
          return res.status(500).json(ApiResponse.error(500, "RecommendationAgent işlemi tamamlanamadı."));
        }

        let reccomendationResult = await RecommendationProcessorFactory
          .getRecommendationProcessor(context, messageGroupid)
          .process()

        //Recommendation Response


        break;



      case "production_info":
        let _context = await conversationServices.createProductPreContext(userid, conversationid);
        let productInformationText = await InformationProcessorFactory
          .getInformationProcessor("production_info", _context, productid, null, messageGroupid)
          .process();
        //userinfo,userid, conversationid, messageid, productinfo,            human_message
        context = await conversationServices.createProductContext(userkey, userid, conversationid, messageid, productInformationText, human_message);

        break;
      case "services_info":
        context = await conversationServices.createServiceContext(intent); // varsa
        systemMessageInfo = await InformationProcessorFactory
          .getInformationProcessor("services_info", context, null, servicesid, messageGroupid)
          .process();
        break;

      case "chat":
        context = await conversationServices.createChatContext();
        system_message = context.content.system_message
        system_message_parent_id = ""


        //Response Burada ayarlansın. Response Stream olarak vereceğiz
        let chatResponseAgent = new ChatResponseAgent();
        await chatResponseAgent.start(MODEL2, 0.2);
        console.log("ChatResponseAgent started successfully");
        let context = await chatResponseAgent.getChatResponseContext(this.userinfo, this.userid, this.conversationid, this.human_message);


        // 💬 Mesajları kaydet
        savedHuman = await MessageFactory
          //type, userid, conversationid,intent, groupid, parentMessageid,message
          .createMessage("human_message", userid, conversationid, intent, messageGroupid)
          .saveHumanMessage(human_message);

        savedSystem = await MessageFactory
          .createMessage("system_message", userid, conversationid, intent, messageGroupid)
          .saveSystemMessage(system_message_parent_id, system_message);
        break;

      default:
        return res.status(500).json(ApiResponse.error(500, "Bilinmeyen intent."));
    }



    /*     // 💬 Mesajları kaydet
        savedHuman = await MessageFactory
          //type, userid, conversationid,intent, groupid, parentMessageid,message
          .createMessage("human_message", userid, conversationid, intent, messageGroupid)
          .saveHumanMessage(human_message);
    
        savedSystem = await MessageFactory
          .createMessage("system_message", userid, conversationid, intent, messageGroupid)
          .saveSystemMessage(system_message_parent_id, system_message);
    

    //Recommendationlarıda burada update edebiliriz.
    messageIds.push(savedHuman._id, savedSystem._id);
    await dbCon.update({ userid, conversationid },
      { messages: messageIds });

    // 🧠 Hafıza özeti
    let isMemorySaved = false;
    if (true) {
      const tempConv = new Conversation(await dbCon.read({ userid, conversationid }));
      const memoryManager = new MemoryManager();
      memoryManager.loadMemory(tempConv);

      const summary = await memoryManager.getSummarizedForMemory();
      await dbCon.update({ userid, conversationid }, { memory: summary.content });
      isMemorySaved = true;
    }

    // ✅ Yanıtla
    const newConversation = await dbCon.read({ userid, conversationid });

    return res.status(200).json(ApiResponse.success(200, "Konuşma başarıyla oluşturuldu!", {
      success: true,
      isMemorySaved,
      conversation: newConversation
    }));

  } catch (error) {
    console.error("🔥 [Conversation] Hata:", error);
    return res.status(500).json(ApiResponse.error(500, "Sunucu hatası", {
      message: "Konuşma oluşturulurken hata oluştu.",
      error: error.message
    }));
  }
});
 */

/**
 * const conversation = asyncHandler(async (req, res) => {
  try {
    console.log("💬 [Conversation] Yeni istek alındı:", req.body);

    const { conversationid, human_message, productid, messageid } = req.body;

    // ✅ 1. Kullanıcı Yetkilendirmesi
    const access_token = req.kauth?.grant?.access_token?.token;
    if (!access_token) {
      console.warn("🔒 [Conversation] Erişim token'ı bulunamadı.");
      return res.status(401).json(ApiResponse.error(401, "Yetkilendirme hatası", {
        message: "Token bulunamadı veya geçersiz."
      }));
    }

    const userkey = await Keycloak.getUserInfo(access_token);
    const user = await User.findOne({ keyid: userkey.sub });
    if (!user) {
      console.warn("❌ [Conversation] Kullanıcı bulunamadı:", userkey.sub);
      return res.status(404).json(ApiResponse.error(404, "Kullanıcı bulunamadı", {
        message: "Geçersiz kullanıcı."
      }));
    }
    console.log("✅ [Conversation] Kullanıcı doğrulandı:", user._id);

    const userid = user._id;
    const io = getIO();
    const dbCon = new ConversationDB();
    let messageIds = [];
    let savedHuman;
    let savedSystem
    // ✅ 2. Konuşma Varlık Kontrolü
    let conversation;
    if (conversationid) {
      const existing = await dbCon.read({ userid, conversationid });
      if (!existing) {
        console.warn("⚠️ [Conversation] Konuşma bulunamadı:", conversationid);
        return res.status(400).json(ApiResponse.error(400, "Geçersiz conversationid"));
      }
      conversation = new Conversation(existing);
      console.log("🗂️ [Conversation] Mevcut konuşma bulundu:", conversationid);
    } else {
      console.warn("⚠️ [Conversation] conversationid eksik.");
      return res.status(400).json(ApiResponse.error(400, "conversationid eksik"));
    }

    // ✅ 3. Mesaj Kontrolü
    if (conversation.messages.length === 0 && (!human_message || human_message.trim() === "")) {
      console.warn("⚠️ [Conversation] Gönderilen mesaj boş.");
      return res.status(400).json(ApiResponse.error(400, "Mesaj bloğu boş olamaz"));
    }

    // ✅ 4. Intent Analizi
    io.to(userid.toString()).emit('agent-feedback', {
      agentId: 'agent-1',
      status: "Kullanıcı isteği analiz ediliyor...",
      timestamp: Date.now(),
    });

    const intentAgent = new IntentAgent();
    await intentAgent.start(MODEL1, 0.2);
    const userIntent = await intentAgent.getIntent(userkey, human_message);
    console.log("🎯 [IntentAgent] Niyet belirlendi:", userIntent.content.intent);

    // ✅ 5. Intent'e Göre İşlem
    let context = null;
    const conversationServices = new ConversationService(userkey, userid, conversationid, human_message);

    let systemMessageInfo;
    if (userIntent.content.intent === "recommendation") {
      const messageGroupid = uuidv4();


      console.log("🧠 [Recommendation] Context:", context);

      io.to(userid.toString()).emit('agent-feedback', {
        agentId: 'agent-1',
        status: context.content.userBehaviorModel,
        timestamp: Date.now(),
      });
      context = await conversationServices.createRecommendationContext(userIntent.content.intent);
      if (!context || context.finish_reason !== "stop") {
        console.error("❌ [Recommendation] Agent tamamlanamadı.");
        return res.status(500).json(ApiResponse.error(500, "RecommendationAgent işlemi tamamlanamadı."));
      }
      // Updated factory call: Pass null as conversation since not provided.
      const processor = RecommendationProcessorFactory.getRecommendationProcessor(context, null, messageGroupid);
      systemMessageInfo = await processor.process();

      // ✅ 6. Mesajların Oluşturulması

      console.log("🆔 [Conversation] Mesaj group id:", messageGroupid);

      const humanMsg = MessageFactory.createMessage("human_message", messageGroupid, human_message, context);
      savedHuman = await humanMsg.saveHumanMessage();

      const sysMsg = MessageFactory.createMessage("system_message", messageGroupid, null, context);
      console.log("systemMessageInfo", systemMessageInfo)
      savedSystem = await sysMsg.saveSystemMessage(systemMessageInfo);

    } else if (userIntent.content.intent === "production_info") {
      const messageGroupid = uuidv4();


      context = await conversationServices.createProductContext(userIntent.content.intent);

      const processor = InformationProcessorFactory.getInformationProcessor(context, messageGroupid);
      systemMessageInfo = await processor.process();

      const humanMsg = MessageFactory.createMessage("human_message", messageGroupid, human_message, context);
      savedHuman = await humanMsg.saveHumanMessage();

      const sysMsg = MessageFactory.createMessage("system_message", messageGroupid, null, context);
      savedSystem = await sysMsg.saveSystemMessage(systemMessageInfo);

    } else if (userIntent.content.intent === "services_info") {
      const messageGroupid = uuidv4();


      const processor = RecommendationProcessorFactory.getRecommendationProcessor(context, messageGroupid);
      systemMessageInfo = await processor.process();

      const humanMsg = MessageFactory.createMessage("human_message", messageGroupid, human_message, context);
      savedHuman = await humanMsg.saveHumanMessage();

      const sysMsg = MessageFactory.createMessage("system_message", messageGroupid, null, context);
      savedSystem = await sysMsg.saveSystemMessage(systemMessageInfo);

    } else if (userIntent.content.intent === "chat") {
      const messageGroupid = uuidv4();

      context = await conversationServices.createChatContext(userIntent.content.intent);
      const humanMsg = MessageFactory.createMessage("human_message", messageGroupid, human_message, context);
      savedHuman = await humanMsg.saveHumanMessage();

      const sysMsg = MessageFactory.createMessage("system_message", messageGroupid, null, context);
      savedSystem = await sysMsg.saveSystemMessage({ questions: {}, recommendations: [] });
    } else {
      console.warn("❓ [Conversation] Bilinmeyen intent:", userIntent.content.intent);
      return res.status(500).json(ApiResponse.error(500, " [Conversation] Bilinmeyen intent."));
    }


    messageIds.push(savedHuman._id, savedSystem._id);
    await dbCon.update(
      { userid, conversationid },
      { messages: messageIds }
    );
    console.log("💾 [Conversation] Mesajlar konuşmaya eklendi.");

    // ✅ 7. Hafıza (Memory) Özeti
    let isMemorySaved = false;
    if (true /* ileride includeInContext olarak koşullanabilir) {
      console.log("🧠 [Conversation] Hafıza özeti oluşturuluyor...");

      const tempConv = new Conversation(await dbCon.read({ userid, conversationid }));
      const memoryManager = new MemoryManager();
      memoryManager.loadMemory(tempConv);

      io.to(userid.toString()).emit('agent-feedback', {
        agentId: 'agent-1',
        status: "Konuşma özeti hazırlanıyor...",
        timestamp: Date.now(),
      });

      //Bu ksımı Rabbit ile halledelim
      const summary = await memoryManager.getSummarizedForMemory();
      await dbCon.update(
        { userid, conversationid },
        { memory: summary.content }
      );
      isMemorySaved = true;
      console.log("✅ [Conversation] Hafıza konuşmaya kaydedildi.");
    }

    // ✅ 8. Güncellenmiş Konuşma ile Yanıt
    const newConversation = await dbCon.read({ userid, conversationid });
    io.to(userid.toString()).emit('agent-feedback', {
      agentId: 'agent-1',
      status: "Konuşma güncellendi.",
      timestamp: Date.now(),
    });

    return res.status(200).json(ApiResponse.success(200, "Konuşma başarıyla oluşturuldu!", {
      success: true,
      isMemorySaved,
      conversation: newConversation
    }));

  } catch (error) {
    console.error("🔥 [Conversation] Sunucu hatası:", error);
    return res.status(500).json(ApiResponse.error(500, "Sunucu hatası", {
      message: "Konuşma oluşturulurken hata oluştu.",
      error: error.message
    }));
  }
});
 */

/**
 * //privete public
const conversation = asyncHandler(async (req, res) => {

  try {
    console.log("[Conversation] Request received with body:", req.body)
    let { conversationid, human_message, productid, messageid } = req.body;


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

    //DB çalıştır.
    const dbCon = new ConversationDB();
    let messageIds = [];

    //Socket io Çalıştır
    const io = getIO();

    const userid = user._id;
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
    if (conversation.messages.length == 0)
      if (!human_message || human_message.trim() === "") {
        console.warn("[Conversation] Empty human message");
        return res.status(400).json(ApiResponse.error(400, "Mesaj bloğu boş olamaz", {
          message: "Lütfen bir mesaj girin."
        }));
      }

    console.log("[Conversation] Retrieving LLM orientation context...");

    io.to(userid.toString()).emit('agent-feedback', {
      agentId: 'agent-1',
      status: `Kullanıcı isteği analiz ediliyor...`,
      timestamp: Date.now(),
    });
    let intentAgent;
    intentAgent = new IntentAgent()
    await intentAgent.start(MODEL1, 0.2);
    console.log("INTENTAGENT started successfully");

    const userIntent = await intentAgent.getIntent(userkey, human_message)
    console.log("[intentAgent] User intent received:", userIntent);
    let context;
    if (userIntent.content.intent == "recommendation") {
      io.to(userid.toString()).emit('agent-feedback', {
        agentId: 'agent-1',
        status: `Kullanıcıya bir öneri yapılacak...`,
        timestamp: Date.now(),
      });




      let conversationServices = new ConversationService(userIntent.content.intent)

      let context = await conversationServices.createContext()

      console.log("[Conversation Recommendation] Recommendation Products...");
      console.log("context.content.products :", conversationContext.content.products);
      console.log("[Conversation Recommendation] Recommendation Services...");
      console.log("context.content.services :", conversationContext.content.services);
      console.log("[Conversation Recommendation] Recommendation Question...");
      console.log("context.content.services :", conversationContext.content.question);



      io.to(userid.toString()).emit('agent-feedback', {
        agentId: 'agent-1',
        status: `${context.content.userBehaviorModel}`,
        timestamp: Date.now(),
      });

      console.log("context", context);
      console.log("[Conversation] Received context with finish_reason:", context.finish_reason);
      if (!context || context.finish_reason !== "stop") {
        console.error("[Conversation] RecommendationAgent process incomplete");
        return res.status(500).json(ApiResponse.error(500, "Konuşma iptal edildi", {
          message: "RecommendationAgent işlemi tamamlanamadı."
        }));
      }

    } else if (userIntent.content.intent == "production_info") {
      io.to(userid.toString()).emit('agent-feedback', {
        agentId: 'agent-1',
        status: `Kullanıcı bir ürün ile ilgili bilgi istiyor...`,
        timestamp: Date.now(),
      });



    } else if (userIntent.content.intent == "services_info") {
      io.to(userid.toString()).emit('agent-feedback', {
        agentId: 'agent-1',
        status: `Kullanıcı bir hizmet ile ilgili bilgi istiyor...`,
        timestamp: Date.now(),
      });



    } else if (userIntent.content.intent == "chat") {
      io.to(userid.toString()).emit('agent-feedback', {
        agentId: 'agent-1',
        status: `Kullanıcı ile sohbet edilecek...`,
        timestamp: Date.now(),
      });
    } else {
      //Recommendation üretilecek

    }

    // **Kullanıcının mesajını oluştur**
    let messageGroupid = uuidv4();
    console.log("[Conversation] Generated messageGroupid:", messageGroupid);

    const humanMessage = MessageFactory.createMessage("human_message", messageGroupid, human_message, _context);
    let nHumanMessage = await humanMessage.saveHumanMessage();
    console.log("[Conversation] Human message saved with id:", nHumanMessage._id);

    const systemMessage = MessageFactory.createMessage("system_message", messageGroupid, null, _context);
    let nSystemMessage = await systemMessage.saveSystemMessage();
    console.log("[Conversation] System message saved with id:", nSystemMessage._id);


    io.to(userid.toString()).emit('agent-feedback', {
      agentId: 'agent-1',
      status: `sistem cevabı hazırlandı...`,
      timestamp: Date.now(),
    });

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
    //context.content.includeInContext
    if (true) {
      console.log("[Conversation] Saving memory for conversation...");

      // Retrieve the current state of the conversation
      let tempConversation = new Conversation(await dbCon.read({ userid, conversationid }));
      console.log("[Conversation] Current conversation state retrieved:");

      // Initialize MemoryManager and load the conversation memory
      let memoryManager = new MemoryManager();
      memoryManager.loadMemory(tempConversation);
      console.log("[Conversation] Memory loaded into MemoryManager");

      io.to(userid.toString()).emit('agent-feedback', {
        agentId: 'agent-1',
        status: `konuşma özeti hazırlanıyor...`,
        timestamp: Date.now(),
      });
      // Get summarized memory for the conversation
      let conversationSummary = await memoryManager.getSummarizedForMemory();
      console.log("[Conversation] Conversation summary generated:", conversationSummary);
      io.to(userid.toString()).emit('agent-feedback', {
        agentId: 'agent-1',
        status: `konuşma özeti hazırlandı...`,
        timestamp: Date.now(),
      });
      // Update the conversation with the summarized memory
      await dbCon.update(
        { userid, conversationid },
        { memory: conversationSummary.content }
      );
      isMemorySaved = true;
      console.log("[Conversation] Memory saved for conversation:", conversationid);
    }
    io.to(userid.toString()).emit('agent-feedback', {
      agentId: 'agent-1',
      status: `konuşma güncellendi...`,
      timestamp: Date.now(),
    });

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
 */