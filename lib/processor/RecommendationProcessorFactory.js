const HighUncertaintyProcessor = require("./HighUncertaintyProcessor");
const LowUncertaintyProcessor = require("./LowUncertaintyProcessor");
const DefaultProcessor = require("./DefaultProcessor");

class RecommendationProcessorFactory {
  static getRecommendationProcessor(context, nConversation, messageGroupid) {
    //Vektor aramasını burada bir kere daha çalıştırım score düşük ise soru alanına yöneltebiliriz. 

    //action parametresi ile değil intent parametresi ile ayırım yapalım
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

module.exports = RecommendationProcessorFactory;