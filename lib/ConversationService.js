

const RecommendationAgent = require("../llm/agents/recommendationAgent.js")
const MODEL2 = "gpt-4o"
class ConversationService {

  constructor(intent, userinfo, userid, conversationid, human_message) {

    this.io = getIO();
    this.dbCon = new ConversationDB();
    this.intent = intent;
    this.userinfo = userinfo
    this.userid = userid
    this.conversationid = conversationid;
    this.human_message = human_message
  }

  async createContext(intent) {
    switch (intent) {
      case "recommendation":
        let recommendationAgent = new RecommendationAgent();
        await recommendationAgent.start(MODEL2, 0.2);
        console.log("RecommendationAgent started successfully");
        context = await recommendationAgent.getOrientationContext(this.userinfo, this.userid, this.conversationid, this.human_message);

        //Başlık Oluştur
        if (context.content?.title != "") {
          const conversationTitle = context.content.title
          await this.dbCon.update(
            { userid, conversationid },
            { title: conversationTitle } // Otomatik olarak `$push` kullanacak
          );
        }

        break;
      case "production_info":

        break;
      case "services_info":

        break;
      case "chat":

        break;
      default:
        break;
    }
  }

}

module.exports = ConversationService