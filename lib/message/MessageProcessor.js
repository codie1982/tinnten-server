const MessageDB = require("../../db/MessageDB.js");
const Message = require('../../models/Message.js');


class BaseMessage {
  constructor(type, userid, conversationid, intent, groupid) {
    this.type = type;
    this.groupid = groupid;
    this.intent = intent || "";
    this.userid = userid
    this.conversationid = conversationid
    this.recommendationid = null
  }
}

class HumanMessage extends BaseMessage {
  //userid, conversationid, groupid, message
  constructor(userid, conversationid, groupid) {
    super("human_message", userid, conversationid, null, groupid);
  }
  async saveHumanMessage(content) {
    const messageDB = new MessageDB();
    return await messageDB.create({
      type: this.type,
      conversationid: this.conversationid,
      userid: this.userid,
      groupid: this.groupid,
      content: content,
      intent: this.intent,
    })
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
   const messageSchema = new mongoose.Schema({
     type: { type: String, enum: ["human_message", "system_message"], required: true }, // Mesaj türü
     conversationid: { type: String, required: true }, // Konuşma ID'si
     userid: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true }, // Kullanıcı ID'si
     parentid: { type: mongoose.Schema.Types.ObjectId, ref: "message", required: false, default: null }, // parent Message ID'si
     groupid: { type: String, required: true },
     content: { type: String, required: false, default: "" },  // Mesaj içeriği
     intent: { type: String, default: "" }, // LLM niyet analizi

     // 🔹 "System Message" için özel alanlar
     recommendations: { type: mongoose.Schema.Types.ObjectId, ref: "recommendation" } // Öneriler
   }, { timestamps: true });} parentMessageid 
   */
class SystemMessage extends BaseMessage {
  //userid, conversationid, intent, groupid, parentMessageid
  constructor(userid, conversationid, intent, groupid) {
    super("system_message", userid, conversationid, intent, groupid); // Varsayılan sistem mesajıxx
  }

  async setRecommendations(id) {
    // **LLM İşleme Mekanizması**
    // **İşlenmiş verileri nesneye kaydet**
    this.recommendationid = id;
    return this
  }

 
  async saveSystemMessage(parentMessageid, message) {
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
      intent: this.intent,
      recommendation: this.recommendationid
    })

    /*  let message = new Message();
     // **Setter metodlarını kullanarak değerleri atıyoruz**
     message.setType("system_message");
     message.setGroupId(this.messageGroupid);
     message.setUserid(this.context.userid)
     message.setConversationId(this.context.conversationid);
     message.setParentid(this.parentMessageid);
     message.setContent(this.context?.content.system_message);
     message.setIntent(this.context?.content.userBehaviorModel);
     message.setSearchContext("");
     message.setIncludeInContext(this.context?.content.includeInContext)
     message.setProductionQuestions(questions == null ? {} : questions?.product)
     message.setServicesQuestions(questions == null ? {} : questions?.services)
     message.setRecommendations(recommendations);
     message.setAction(this.context?.content.action); // ✅ Yeni action parametresi eklendi
     // **Veritabanına kaydet**
     console.log("message", message)
     let systemMessage = await new MessageDB().create(message);
     return systemMessage */
  }
  async updateSystemMessage(messageid, parentMessageid, message) {

    const messageDB = new MessageDB();
    return await messageDB.update({ _id: messageid }, {
      parentid: parentMessageid,
      content: message,
    })
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
  //type, userid, conversationid,intent, groupid, parentMessageid,message
  static createMessage(type, userid, conversationid, intent, groupid) {
    switch (type) {
      case "human_message":
        return new HumanMessage(userid, conversationid, groupid);
      case "system_message":
        return new SystemMessage(userid, conversationid, intent, groupid);
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