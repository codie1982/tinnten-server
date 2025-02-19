class BaseMessage {
    constructor(type, groupid, content) {
      this.type = type;
      this.groupid = groupid;
      this.content = content || "";
    }
  
    async saveToDatabase() {
      const message = new Message({
        type: this.type,
        groupid: this.groupid,
        content: this.content,
      });
  
      return await message.save();
    }
  }
  
  class HumanMessage extends BaseMessage {
    constructor(groupid, content) {
      super("human_message", groupid, content);
    }
  }
  
  class SystemMessage extends BaseMessage {
    constructor(groupid, content, intent, searchContext, questions = [], finishReason = "") {
      super("system_message", groupid, content);
      this.intent = intent;
      this.search_context = searchContext;
      this.questions = questions;
      this.finish_reason = finishReason;
      this.systemData = {};
    }
  
    async saveToDatabase() {
      const message = new Message({
        type: this.type,
        groupid: this.groupid,
        content: this.content,
        intent: this.intent,
        search_context: this.search_context,
        questions: this.questions,
        finish_reason: this.finish_reason,
        systemData: this.systemData,
      });
  
      return await message.save();
    }
  }
  
  class MessageFactory {
    static createMessage(type, groupid, content, intent = null, searchContext = null, questions = [], finishReason = "") {
      switch (type) {
        case "human_message":
          return new HumanMessage(groupid, content);
        case "system_message":
          return new SystemMessage(groupid, content, intent, searchContext, questions, finishReason);
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