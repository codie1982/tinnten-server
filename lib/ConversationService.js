

const RecommendationAgent = require("../llm/agents/recommendationAgent.js")
const ChatResponseAgent = require("../llm/agents/chatResponseAgent.js")
const ProducInfoResponseAgent = require("../llm/agents/producInfoResponseAgent.js")
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

  async createRecommendationContext() {
    let recommendationAgent = new RecommendationAgent();
    await recommendationAgent.start(MODEL2, 0.2);
    console.log("RecommendationAgent started successfully");
    let context = await recommendationAgent.getOrientationContext(this.userinfo, this.userid, this.conversationid, this.human_message);

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


  async createProductPreContext() {
    return {
      userid: this.userid,
      conversationid: this.conversationid,
    };
  }

  async createProductContext(messageid,productinfo) {
    let producInfoResponseAgent = new ProducInfoResponseAgent();
    await producInfoResponseAgent.start(MODEL2, 0.2);
    console.log("producInfoResponseAgent started successfully");
    let context = await producInfoResponseAgent.getProductionInfoResponseContext(this.userinfo, this.userid, this.conversationid, messageid,productinfo, this.human_message);
    return context;
  }

  async createServiceContext() {
    let chatResponseAgent = new ChatResponseAgent();
    await chatResponseAgent.start(MODEL2, 0.2);
    console.log("ChatResponseAgent started successfully");
    let context = await chatResponseAgent.getChatResponseContext(this.userinfo, this.userid, this.conversationid, this.human_message);
    return context;
  }

  async createChatContext() {
    let chatResponseAgent = new ChatResponseAgent();
    await chatResponseAgent.start(MODEL2, 0.2);
    console.log("ChatResponseAgent started successfully");
    let context = await chatResponseAgent.getChatResponseContext(this.userinfo, this.userid, this.conversationid, this.human_message);
    return context;
  }

}

module.exports = ConversationService