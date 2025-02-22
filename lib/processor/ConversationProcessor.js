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

  async createSystemMessage(content, intent, searchContext, questions = {}, finishReason = "", recommendations = [], action = []) {
    try {
      let message = new Message();
      // **Setter metodlarını kullanarak değerleri atıyoruz**
      message.setType("system_message");
      message.setGroupId(this.messageGroupid);
      message.setContent(content);
      message.setIntent(intent);
      message.setSearchContext(searchContext);
      message.setIncludeInContext(questions.product)
      message.setProductionQuestions(questions.services)
      message.setRecommendations(recommendations);
      message.setAction(action); // ✅ Yeni action parametresi eklendi
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