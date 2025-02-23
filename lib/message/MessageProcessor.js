const ConversationProcessorFactory = require("../processor/ConversationProcessorFactory.js");
const Message = require("../../models/Message.js") // Mongoose Message modeli
const Question = require("../../models/Question.js"); // Mongoose Question modeli
const MessageDB = require("../../db/MessageDB.js");
const QuestionDB = require("../../db/QuestionDB.js");


class BaseMessage {
  constructor(type, groupid, messageContent) {
    this.type = type;
    this.groupid = groupid;
    this.content = messageContent || "";
    this.intent = "";
    this.entities = [];
    this.includeInContext = false;
    this.search_context = [];
  }

  async saveToDatabase() {
    const messageDB = new MessageDB();
    return await messageDB.create({
      type: this.type,
      groupid: this.groupid,
      content: this.content,
      intent: this.intent,
      entities: this.entities,
      includeInContext: this.includeInContext,
      search_context: this.search_context,
    })
  }
}

class HumanMessage extends BaseMessage {
  constructor(groupid, content) {
    super("human_message", groupid, content);
  }
}

class SystemMessage extends BaseMessage {
  constructor(context, messageGroupid) {
    super("system_message", messageGroupid, context.content.system_message || ""); // Varsayılan sistem mesajı

    this.context = context;
    this.productionQuestions = [];
    this.servicesQuestions = [];
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

  async processAndSave() {
    // **LLM İşleme Mekanizması**
    // Updated factory call: Pass null as conversation since not provided.
    const processor = ConversationProcessorFactory.getProcessor(this.context, null, this.groupid);

    const systemMessage = await processor.process();
    // **İşlenmiş verileri nesneye kaydet**
    this.action = systemMessage.action;
    this.content = systemMessage.content;
    this.intent = systemMessage.intent;
    this.entities = systemMessage.entities || [];
    this.includeInContext = systemMessage.includeInContext || false;
    this.search_context = systemMessage.search_context || [];
    this.recommendations = systemMessage.recommendations || [];

    return systemMessage
  }
}

class MessageFactory {
  static createMessage(type, groupid, content, context = null) {
    switch (type) {
      case "human_message":
        return new HumanMessage(groupid, content);
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