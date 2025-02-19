// **Factory Pattern ile Processor Seçimi**
const HighUncertaintyProcessor = require("./HighUncertaintyProcessor")
const LowUncertaintyProcessor = require("./LowUncertaintyProcessor")
const DefaultProcessor = require("./DefaultProcessor")

class ConversationProcessorFactory {
    static getProcessor(context, nConversation, messageGroupid) {
      switch (context.uncertainty_level) {
        case "high":
          return new HighUncertaintyProcessor(context, nConversation, messageGroupid);
        case "low":
          return new LowUncertaintyProcessor(context, nConversation, messageGroupid);
        default:
          return new DefaultProcessor(context, nConversation, messageGroupid);
      }
    }
  }
  // **Sınıfları Dışa Aktar**
module.exports = ConversationProcessorFactory