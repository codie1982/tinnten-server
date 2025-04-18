const HighUncertaintyProcessor = require("./HighUncertaintyProcessor");
const LowUncertaintyProcessor = require("./LowUncertaintyProcessor");
const DefaultProcessor = require("./DefaultProcessor");
const RecommendationDB = require("../../db/RecommendationDB");

class RecommendationProcessorFactory {
  static async getRecommendationProcessor(context,human_message) {
    //uncertainty_level parametresi ile ayırım yapalım
    //uncertainty_level : Belirsizlik seviyesi
    //High ise Sorular üreteceğiz
    //low ise öneriler yapılacak.

    //new Recommendation Kısmını burada ol

    switch (context.uncertainty_level) {
      case "high":
        let highRecom = await new RecommendationDB().create({ type: "question" })
        return new HighUncertaintyProcessor(context, highRecom._id,human_message);
      case "low":
        let lowRecom = await new RecommendationDB().create({ type: "recommendation" })
        console.log("context", JSON.stringify(context), lowRecom._id)
        return new LowUncertaintyProcessor(context, lowRecom._id);
      default:
        return new DefaultProcessor(context, "");
    }
  }
}

module.exports = RecommendationProcessorFactory;