const ConversationProcessor = require("./ConversationProcessor");
const Question = require("../../models/Question");
const QuestionDB = require("../../db/QuestionDB");

class HighUncertaintyProcessor extends ConversationProcessor {
  async process() {
    console.log("🔍 Yüksek belirsizlik işlem başlatılıyor...");

    let productionQuestionsIds = [];
    let servicesQuestionsIds = [];

    // Ürün soruları
    if (["product", "both"].includes(this.context.content?.request_type)) {
      let productionQuestions = this.context.content?.products?.question || [];

      for (let question of productionQuestions) {
        let _question = new Question({
          conversationid: this.nConversation._id,
          questionText: question.q,
          important: question.important,
          input_type: question.input_type,
          options: question.options,
        });

        let savedQuestion = await new QuestionDB().create(_question);
        productionQuestionsIds.push(savedQuestion._id);
      }
    }

    // Hizmet soruları
    if (["service", "both"].includes(this.context.content?.request_type)) {
      let servicesQuestions = this.context.content?.services?.question || [];

      for (let question of servicesQuestions) {
        let _question = new Question({
          conversationid: this.nConversation._id,
          questionText: question.q,
          important: question.important,
          input_type: question.input_type,
          options: question.options,
        });

        let savedQuestion = await new QuestionDB().create(_question);
        servicesQuestionsIds.push(savedQuestion._id);
      }
    }

    return this.createSystemMessage(
      this.context.system_message,
      this.context.context,
      this.context.content?.search_context || "",
      { product: [...productionQuestionsIds], services: [...servicesQuestionsIds] }, // **Sorular buraya ekleniyor**
      this.context.finish_reason,
      [], // **High Uncertainty'de recommendations yok**
      [] // **High Uncertainty'de action parametresi*
    );
  }
}

module.exports = HighUncertaintyProcessor;