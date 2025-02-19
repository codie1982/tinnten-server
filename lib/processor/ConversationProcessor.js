// **Factory Pattern ile Processor Seçimi**

const Message = require("../../models/messageModel")
class ConversationProcessor {
    constructor(context, nConversation, messageGroupid) {
      this.context = context;
      this.nConversation = nConversation;
      this.messageGroupid = messageGroupid;
    }
  
    async process() {
      throw new Error("process metodu alt sınıflarda uygulanmalıdır.");
    }
  
    async createSystemMessage(content, intent, searchContext, questions = [], finishReason = "") {
      return new Message({
        type: "system_message",
        groupid: this.messageGroupid,
        content,
        intent,
        search_context: searchContext,
        questions,
        finish_reason: finishReason,
        systemData: {},
      });
    }
  }
  // **Sınıfları Dışa Aktar**
module.exports = ConversationProcessor