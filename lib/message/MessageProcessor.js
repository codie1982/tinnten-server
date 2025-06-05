const MessageDB = require("../../db/MessageDB.js");
const Message = require('../../models/Message.js');


class BaseMessage {
  constructor(type, userid, conversationid, intent, groupid, messageid) {
    this.type = type;
    this.messageid = messageid || null; // Benzersiz mesaj ID'si
    this.groupid = groupid;
    this.intent = intent || "";
    this.userid = userid
    this.conversationid = conversationid
    this.recommendationid = null
  }
}

class HumanMessage extends BaseMessage {
  //userid, conversationid, groupid, message
  constructor(userid, conversationid, groupid,messageid) {
    super("human_message", userid, conversationid, null, groupid, messageid);
  }
  async saveHumanMessage(content) {
    const messageDB = new MessageDB();
    return await messageDB.create({
      type: this.type,
      conversationid: this.conversationid,
      userid: this.userid,
      groupid: this.groupid,
      content: content,
    })
  }
  async getPayload(content) {
    return {
      type: this.type,
      messageid: this.messageid,
      conversationid: this.conversationid,
      userid: this.userid,
      groupid: this.groupid,
      content: content,
    }
  }

  async updateSystemMessage(messageid, parentMessageid, message) {
    const messageDB = new MessageDB();
    return await messageDB.update({ _id: messageid }, {
      parentid: parentMessageid,
      content: message,
    })
  }
}

/**
  * 
   type: { type: String, enum: ["human_message", "system_message"], required: true }, // Mesaj türü
   conversationid: { type: String, required: true }, // Konuşma ID'si
   userid: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true }, // Kullanıcı ID'si
   parentid: { type: mongoose.Schema.Types.ObjectId, ref: "message", required: false, default: null }, // parent Message ID'si
   groupid: { type: String, required: true },
   content: { type: String, required: false, default: "" },  // Mesaj içeriği
   intents: {  type: mongoose.Schema.Types.Mixed, default: null }, // LLM niyet analizi
   orchestratorresponse: {  type: mongoose.Schema.Types.Mixed, default: null }, // LLM niyet analizi
   meta: {
     type: mongoose.Schema.Types.Mixed,
     default: {}
   },
  */
class SystemMessage extends BaseMessage {
  //userid, conversationid, intent, groupid, parentMessageid
  constructor(userid, conversationid, intent, groupid, messageid) {
    super("system_message", userid, conversationid, intent, groupid, messageid); // Varsayılan sistem mesajıxx
  }



  async saveSystemMessage(parentMessageid, message, meta = {}, intents = {}, orchestratorResponse = {}) {
    // **LLM İşleme Mekanizması**
    // **İşlenmiş verileri nesneye kaydet**
    const messageDB = new MessageDB();

    return await messageDB.create({
      type: this.type,
      conversationid: this.conversationid,
      userid: this.userid,
      groupid: this.groupid,
      parentid: parentMessageid,
      content: message,
      intents: intents,
      orchestratorresponse: orchestratorResponse, // Orkestratör yanıtı
      meta: meta, // Ekstra meta veriler
    })
  }
  async updateSystemMessage(messageid, parentMessageid, message) {

    const messageDB = new MessageDB();
    return await messageDB.update({ _id: messageid }, {
      parentid: parentMessageid,
      content: message,
    })
  }
  async getPayload(parentMessageid, human_message,system_message, intents = [], orchestratorResponse = {}) {
    return {
      conversationid: this.conversationid,
      messageid: this.messageid,
      userid: this.userid,
      groupid: this.groupid,
      parentid: parentMessageid,
      human_message: human_message,
      system_message: system_message,
      intents,
      orchestratorresponse: orchestratorResponse, // Orkestratör yanıtı
      meta: {}, // Ekstra meta veriler
    }
  }
}

class MessageFactory {
  static selectedMessage(type, userid, conversationid, intent, groupid) {
    switch (type) {
      case "human_message":
        return new HumanMessage(userid, conversationid, groupid);
      case "system_message":
        return new SystemMessage(userid, conversationid, intent, groupid);
      default:
        throw new Error("Bilinmeyen mesaj türü.");
    }
  }
  //type, userid, conversationid, groupid, parentMessageid,message
  static createMessage(type, userid, conversationid,messageid) {
    switch (type) {
      case "human_message":
        return new HumanMessage(userid, conversationid,messageid);
      case "system_message":
        return new SystemMessage(userid, conversationid,messageid);
      default:
        throw new Error("Bilinmeyen mesaj türü.");
    }
  }
}

// **Sınıfları Dışa Aktar**
module.exports = {
  BaseMessage,
  HumanMessage,
  SystemMessage,
  MessageFactory,
};