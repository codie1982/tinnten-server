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

      let productionQuestions = this.context.content?.question || [];
      
      /**
       * const questionSchema = new mongoose.Schema({
           questionText: { type: String, required: true },  // LLM'in sorduğu soru
           important: { type: String, enum: ["high", "low"] },
           input_type: { type: String },
           options: [{ type: String }],
           answer: { type: String }  // Kullanıcının verdiği cevaplar
       }, { timestamps: true });
       */
      for (let question of productionQuestions) {
        let _question = new Question({
          questionText: question.q,
          important: question.important,
          input_type: question.input_type,
        });

        let savedQuestion = await new QuestionDB().create(_question);
        productionQuestionsIds.push(savedQuestion._id);
      }
    }

    // Hizmet soruları
    if (["service", "both"].includes(this.context.content?.request_type)) {
      let servicesQuestions = this.context.content?.question || [];

      for (let question of servicesQuestions) {
        let _question = new Question({
          questionText: question.q,
          important: question.important,
          input_type: question.input_type,
        });

        let savedQuestion = await new QuestionDB().create(_question);
        servicesQuestionsIds.push(savedQuestion._id);
      }
    }

    //llmContext, questions = {}, recommendations = []
    return this.createSystemMessage(this.context, { product: productionQuestionsIds, services: servicesQuestionsIds }, []);
  }
}

module.exports = HighUncertaintyProcessor;