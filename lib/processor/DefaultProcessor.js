const ConversationProcessor = require("./ConversationProcessor")
class DefaultProcessor extends ConversationProcessor {
  async process() {
    console.log("Default işlem başlatılıyor...");

    return this.createSystemMessage(
      this.context.content.system_message,
      this.context.context,
      this.context.content?.search_context || "", // **Doğru erişim sağlandı**
      {}, // **Default'ta question yok**
      this.context.finish_reason,
      [], // **Default'ta recommendation da yok**
      [] // **Default'ta action yok**
    );
  }
}

// **Sınıfları Dışa Aktar**

module.exports = DefaultProcessor