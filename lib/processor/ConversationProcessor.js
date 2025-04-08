const Message = require("../../models/Message");
const MessageDB = require("../../db/MessageDB")
class ConversationProcessor {
  constructor(context, messageGroupid) {
    this.context = context;
    this.messageGroupid = messageGroupid;
  }
  async process() {
    throw new Error("process metodu alt sınıflarda uygulanmalıdır.");
  }
  async createSystemMessage(questions = {}, recommendations = []) {
    try {
      return { questions, recommendations };
    } catch (error) {
      console.error("❌ Sistem mesajı oluşturulurken hata oluştu:", error.message);
      throw new Error("Sistem mesajı kaydedilemedi.");
    }
  }
}

module.exports = ConversationProcessor;