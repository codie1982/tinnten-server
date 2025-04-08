const MessageDB = require("../../db/MessageDB.js");
const Message = require('../../models/Message.js');


class BaseMessage {
  constructor(type, context, groupid, content) {
    this.type = type;
    this.groupid = groupid;
    this.context = context;
    this.content = content || "";
    this.intent = "";
    this.entities = [];
    this.includeInContext = false;
    this.search_context = [];
  }
}

class HumanMessage extends BaseMessage {
  constructor(context, groupid, content) {
    super("human_message", context, groupid, content, "");
  }
  async saveHumanMessage() {
    const messageDB = new MessageDB();
    return await messageDB.create({
      type: this.type,
      conversationid: this.context.conversationid,
      userid: this.context.userid,
      groupid: this.groupid,
      content: this.content,
      intent: this.intent,
      entities: this.entities,
      includeInContext: this.includeInContext,
      search_context: this.search_context,
    })
  }
}

class SystemMessage extends BaseMessage {
  constructor(context, messageGroupid) {
    super("system_message", context, messageGroupid, context.content.system_message || ""); // Varsayılan sistem mesajıxx
    this.context = context;
    this.productionQuestions = [];
    this.servicesQuestions = [];
    this.messageGroupid = messageGroupid;
    this.systemData = { recommendations: [] };
    this.userBehaviorModel = context.content.userBehaviorModel || "";
    this.title = context.content.title || "Bilinmeyen Başlık";
    this.request_type = context.content.request_type || "unknown";
    this.uncertainty_level = context.content.uncertainty_level || "";
    this.multiple_request = context.content.multiple_request || false;
    this.products = context.content.products || [];
    this.services = context.content.services || [];
    this.general_categories = context.content.general_categories || [];
    this.answer = {}
  }

  async saveSystemMessage({ questions = {}, recommendations = [] }) {
    // **LLM İşleme Mekanizması**
    // **İşlenmiş verileri nesneye kaydet**
    let message = new Message();
    // **Setter metodlarını kullanarak değerleri atıyoruz**
    message.setType("system_message");
    message.setGroupId(this.messageGroupid);
    message.setUserid(this.context.userid)
    message.setConversationId(this.context.conversationid);
    message.setContent(this.context?.content.system_message);
    message.setIntent(this.context?.content.userBehaviorModel);
    message.setSearchContext("");
    message.setIncludeInContext(this.context?.content.includeInContext)
    message.setProductionQuestions(questions.product)
    message.setServicesQuestions(questions.services)
    message.setRecommendations(recommendations);
    message.setAction(this.context?.content.action); // ✅ Yeni action parametresi eklendi
    // **Veritabanına kaydet**
    let systemMessage = await new MessageDB().create(message);
    return systemMessage
  }
}

class MessageFactory {

  static createMessage(type, groupid, content, context) {
    switch (type) {
      case "human_message":
        if (!context) {
          throw new Error("HumanMessagee oluşturmak için context gereklidir.");
        }
        return new HumanMessage(context, groupid, content);
      case "system_message":
        if (!context) {
          throw new Error("SystemMessage oluşturmak için context gereklidir.");
        }
        return new SystemMessage(context, groupid);
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