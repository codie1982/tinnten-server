const Message = require("../../models/Message");
const MessageDB = require("../../db/MessageDB")
class ConversationProcessor {
  constructor(context, nConversation, messageGroupid) {
    this.context = context;
    this.nConversation = nConversation;
    this.messageGroupid = messageGroupid;
  }

  async process() {
    throw new Error("process metodu alt sınıflarda uygulanmalıdır.");
  }

  async createSystemMessage(llmContext, questions = {}, recommendations = []) {
    try {
      console.log("questions", questions.product)
      console.log("questions", questions.services)
      let message = new Message();
      // **Setter metodlarını kullanarak değerleri atıyoruz**
      message.setType("system_message");
      message.setGroupId(this.messageGroupid);
      message.setContent(llmContext?.content.system_message);
      message.setIntent(llmContext?.content.userBehaviorModel);
      message.setSearchContext("");
      message.setIncludeInContext(llmContext?.content.includeInContext)
      message.setProductionQuestions(questions.product)
      message.setServicesQuestions(questions.services)
      message.setRecommendations(recommendations);
      message.setAction(llmContext?.content.action); // ✅ Yeni action parametresi eklendi
      // **Veritabanına kaydet**
      let savedMessage = await new MessageDB().create(message);
      return savedMessage;

    } catch (error) {
      console.error("❌ Sistem mesajı oluşturulurken hata oluştu:", error.message);
      throw new Error("Sistem mesajı kaydedilemedi.");
    }
  }
}

module.exports = ConversationProcessor;