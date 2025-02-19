const ConversationProcessor = require("./ConversationProcessor")

class HighUncertaintyProcessor extends ConversationProcessor {
    async process() {
      console.log("High uncertainty işlem başlatılıyor...");
      
      let productionQuestionsIds = [];
      let servicesQuestionsIds = [];
  
      // Ürün soruları
      if (this.context.content.request_type === "product" || this.context.content.request_type === "both") {
        let productionQuestions = this.context.content.products?.question || [];
  
        if (productionQuestions.length > 0) {
          for (let question of productionQuestions) {
            let _question = new Question({
              conversationid: this.nConversation._id,
              questionText: question.q,
              important: question.important,
              input_type: question.input_type,
              options: question.options,
            });
  
            const savedQuestion = await _question.save();
            productionQuestionsIds.push(savedQuestion._id);
          }
        }
      }
  
      // Hizmet soruları
      if (this.context.content.request_type === "service" || this.context.content.request_type === "both") {
        let servicesQuestions = this.context.content.services?.question || [];
  
        if (servicesQuestions.length > 0) {
          for (let question of servicesQuestions) {
            let _question = new Question({
              conversationid: this.nConversation._id,
              questionText: question.q,
              important: question.important,
              input_type: question.input_type,
              options: question.options,
            });
  
            const savedQuestion = await _question.save();
            servicesQuestionsIds.push(savedQuestion._id);
          }
        }
      }
  
      return this.createSystemMessage(
        this.context.system_message,
        this.context.context,
        this.context.product?.pro?.search_context,
        [...productionQuestionsIds, ...servicesQuestionsIds],
        this.context.finish_reason
      );
    }
  }

  // **Sınıfları Dışa Aktar**
module.exports =HighUncertaintyProcessor