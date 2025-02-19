const ConversationProcessor = require("./ConversationProcessor")
class DefaultProcessor extends ConversationProcessor {
    async process() {
      console.log("Default işlem başlatılıyor...");
  
      return this.createSystemMessage(
        this.context.content.system_message,
        this.context.context,
        this.context.search_context,
        [],
        this.context.finish_reason
      );
    }
  }

  // **Sınıfları Dışa Aktar**
module.exports = DefaultProcessor