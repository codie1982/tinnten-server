const ConversationProcessor = require("./ConversationProcessor")
class DefaultProcessor extends ConversationProcessor {
  async process() {
    console.log("Default işlem başlatılıyor...");
        //llmContext, questions = {}, recommendations = []
    return this.createSystemMessage(this.context,{},[]);
  }
}

// **Sınıfları Dışa Aktar**

module.exports = DefaultProcessor