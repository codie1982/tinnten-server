const ConversationProcessor = require("./ConversationProcessor")
class DefaultProcessor extends ConversationProcessor {
  async process() {
    console.log("Default işlem başlatılıyor...");
    //return this.createSystemMessage(this.context,{},[]);
    return await this.createRecommendation("default", null)
  }
}

module.exports = DefaultProcessor