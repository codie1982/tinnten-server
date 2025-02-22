const HighUncertaintyProcessor = require("./HighUncertaintyProcessor");
const LowUncertaintyProcessor = require("./LowUncertaintyProcessor");
const DefaultProcessor = require("./DefaultProcessor");

class ConversationProcessorFactory {
  static getProcessor(context, nConversation, messageGroupid) {
    switch (context.content?.action) {
      case "question":
        return new HighUncertaintyProcessor(context, nConversation, messageGroupid);
      case "recommendation":
        return new LowUncertaintyProcessor(context, nConversation, messageGroupid);
      default:
        return new DefaultProcessor(context, nConversation, messageGroupid);
    }
  }
}

module.exports = ConversationProcessorFactory;