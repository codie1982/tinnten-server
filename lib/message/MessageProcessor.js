const MessageDB = require("../../db/MessageDB.js");
const Message = require('../../models/Message.js');


class BaseMessage {
  constructor(userid, conversationid) {
    this.userid = userid
    this.conversationid = conversationid
  }
}


/**
  * 
const messageSchema = new mongoose.Schema({
  conversationid: { type: String, required: true }, // Konuşma ID'si
  messageid: { type: String, unique: true }, // Mesaj için benzersiz UUID
  userid: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true }, // Kullanıcı ID'si
  parentid: { type: mongoose.Schema.Types.ObjectId, ref: "message", required: false, default: null }, // parent Message ID'si
  human_message: { type: String, required: false, default: "" }, // Kullanıcı mesajı
  system_message: { type: String, required: false, default: "" }, // LLM mesajı
  intents: [{ type: mongoose.Schema.Types.Mixed, default: null }], // LLM niyet analizi
  orchestratorresponse: { type: mongoose.Schema.Types.Mixed, default: null }, // LLM niyet analizi
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
}, { timestamps: true });
  */
class SystemMessage extends BaseMessage {
  //userid, conversationid, intent, groupid, parentMessageid
  constructor(userid, conversationid) {
    super(userid, conversationid); // Varsayılan sistem mesajıxx
  }

  async getPayload(parentMessageid, human_message,system_message, intent = {}, orchestratorResponse = {},messageid = null) {
    const now = new Date().toISOString().replace('Z', '+00:00');
    return {
      conversationid: this.conversationid,
      messageid: messageid,
      userid: this.userid,
      parentid: parentMessageid,
      human_message: human_message,
      system_message: system_message,
      intent,
      orchestratorresponse: orchestratorResponse, // Orkestratör yanıtı
      meta: {}, // Ekstra meta veriler
      createdAt: now,
      updatedAt: now
    }
  }
}

class MessageFactory {
 
  //type, userid, conversationid, groupid, parentMessageid,message
  static createMessage(type, userid, conversationid) {
    switch (type) {
      case "system_message":
        return new SystemMessage(userid, conversationid);
      default:
        throw new Error("Bilinmeyen mesaj türü.");
    }
  }
}

// **Sınıfları Dışa Aktar**
module.exports = {
  BaseMessage,
  SystemMessage,
  MessageFactory,
};