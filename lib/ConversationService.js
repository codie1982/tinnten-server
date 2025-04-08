

const RecommendationAgent = require("../llm/agents/recommendationAgent.js")
const ConversationDB = require("../db/ConversationMongoDB.js");
const MODEL2 = "gpt-4o"
class ConversationService {

  constructor(userinfo, userid, conversationid, human_message) {

    this.dbCon = new ConversationDB();
    this.userinfo = userinfo
    this.userid = userid
    this.conversationid = conversationid;
    this.human_message = human_message
    this.context = null
  }

  async createContext(intent) {
    switch (intent) {
      case "recommendation":
        return await this.setRecommendation(this.userinfo, this.userid, this.conversationid, this.human_message);
      case "production_info":
        return this.context;
      case "services_info":
        return this.context;
      case "chat":
        return this.context;
      default:
        return await setRecommendation();
    }
  }

  async setRecommendation(userinfo, userid, conversationid, human_message) {
    let recommendationAgent = new RecommendationAgent();
    await recommendationAgent.start(MODEL2, 0.2);
    console.log("RecommendationAgent started successfully");
    let context = await recommendationAgent.getOrientationContext(userinfo, userid, conversationid, human_message);

    //Başlık Oluştur
    if (context.content?.title != "") {
      const conversationTitle = context.content.title
      await this.dbCon.update(
        { userid, conversationid },
        { title: conversationTitle } // Otomatik olarak `$push` kullanacak
      );
    }
    return context;
  }




}

module.exports = ConversationService