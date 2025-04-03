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
const ConversationDB = require("../../db/ConversationMongoDB.js");
const MessageDB = require("../../db/messageDB.js");
const MODEL1 = "gpt-3.5-turbo"
const MODEL2 = "gpt-4o"
const Keycloak = require("../../lib/Keycloak.js");

const MemoryManager = require("../../llm/memory/MemoryManager.js");
const { MessageFactory } = require("../../lib/message/MessageProcessor.js");
const QuestionDB = require("../../db/QuestionDB.js");
const { parse } = require("dotenv");
const CONSTANT = { active: "active" }

const { getIO } = require('../../lib/Socket.js');

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

  const io = getIO();
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
    if (conversation.messages.length == 0)
      if (!human_message || human_message.trim() === "") {
        console.warn("[Conversation] Empty human message");
        return res.status(400).json(ApiResponse.error(400, "Mesaj bloğu boş olamaz", {
          message: "Lütfen bir mesaj girin."
        }));
      }

    console.log("[Conversation] Retrieving LLM orientation context...");
    console.log("userid:", userid);
    io.to(userid.toString()).emit('agent-feedback', {
      agentId: 'agent-1',
      status: `Kullanıcı isteği analiz ediliyor...`,
      timestamp: Date.now(),
    });
    const context = await LLM.getOrientationContext(userkey, userid, conversation, human_message);

    console.log("[Conversation Recommendation] Recommendation Products...");
    console.log("context.content.products :", context.content.products);
    console.log("[Conversation Recommendation] Recommendation Services...");
    console.log("context.content.services :", context.content.services);
    console.log("[Conversation Recommendation] Recommendation Question...");
    console.log("context.content.services :", context.content.question);

    if (context.content?.title != "") {
      const conversationTitle = context.content.title
      console.log("userid, conversationid", userid, conversationid)
      await dbCon.update(
        { userid, conversationid },
        { title: conversationTitle } // Otomatik olarak `$push` kullanacak
      );

      io.to(userid.toString()).emit('agent-feedback', {
        agentId: 'agent-1',
        status: `Konuşma içeriği ${conversationTitle}`,
        timestamp: Date.now(),
      });
      io.to(userid.toString()).emit('agent-update-title', {
        title: `${conversationTitle}`,
        conversationid: conversationid,
        timestamp: Date.now(),
      });
    }


    io.to(userid.toString()).emit('agent-feedback', {
      agentId: 'agent-1',
      status: `${context.content.userBehaviorModel}`,
      timestamp: Date.now(),
    });
    console.log("context", context);
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


    const humanMessage = MessageFactory.createMessage("human_message", messageGroupid, human_message, context);
    let nHumanMessage = await humanMessage.saveToDatabase();
    console.log("[Conversation] Human message saved with id:", nHumanMessage._id);

    const systemMessage = MessageFactory.createMessage("system_message", messageGroupid, null, context);
    let nSystemMessage = await systemMessage.processAndSave();
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

const feedbacktest = asyncHandler(async (req, res) => {
  const access_token = req.kauth.grant.access_token.token;
  const userkey = await Keycloak.getUserInfo(access_token);
  const user = await User.findOne({ keyid: userkey.sub });
  if (!user) {
    return res.status(404).json(ApiResponse.error(404, "Kullanıcı bulunamadı", { message: "Geçersiz kullanıcı" }));
  }
  const userid = user._id;

  const io = getIO();
  let count = 0;
  const interval = setInterval(() => {
    count++;
    io.to(userid).emit('agent-feedback', {
      agentId: 'agent-1',
      status: `Mesaj #${count} gönderildi`,
      timestamp: Date.now(),
    });

    if (count >= 10) {
      clearInterval(interval);
      // 💡 Son mesaj gönderildikten sonra HTTP response'u gönderiyoruz
      res.status(200).json(ApiResponse.success(200, '10 feedback gönderildi', {}));
    }
  }, 500);
});

module.exports = {
  create, conversation, deleteConversation, feedbacktest, updateTitle, historyies, detail, answer, deleteQuestion, search
};


