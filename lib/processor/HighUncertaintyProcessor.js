const ConversationProcessor = require("./ConversationProcessor");
const Question = require("../../models/Question");
const QuestionDB = require("../../db/QuestionDB");
const RecommendationDB = require("../../db/RecommendationDB");

const QuestionAgent = require("../../llm/agents/questionAgent")
const MODEL2 = "gpt-4o"
class HighUncertaintyProcessor extends ConversationProcessor {
  constructor(context, id, human_message) {
    super(context, id)
    this.human_message = human_message
  }
  async process() {
    console.log("🔍 Yüksek belirsizlik işlem başlatılıyor...");
    //QA Agent oluşturup soru ürettirmemiz gerekli.
    let questionAgent = new QuestionAgent();
    await questionAgent.start(MODEL2, 0.2);
    console.log("QuestionAgent started successfully");

    const questionsContext = await questionAgent.getQuestion(this.human_message)
    console.log("[QuestionAgent] response context...", questionsContext);


    let _questionsids = []
    for (let question of questionsContext) {
      let savedQuestion = await new QuestionDB().create(question);
      _questionsids.push(savedQuestion._id)
    }
    let updateRecommendation = await new RecommendationDB()
      .update({ _id: this.recomid },
        {
          type: "question",
          questions: _questionsids,
        }
      );


    //llmContext, questions = {}, recommendations = []
    //return this.createSystemMessage({ product: productionQuestionsIds, services: servicesQuestionsIds }, []);
    return await this.createRecommendation("question", updateRecommendation._id);
  }
}

module.exports = HighUncertaintyProcessor;