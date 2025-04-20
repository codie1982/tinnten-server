
const { questionContext } = require("../system_promt/questionContext")
const BaseAgent = require("./BaseAgent")

class QuestionAgent extends BaseAgent {
     async getQuestion(human_message) {
        try {
          console.log("[QuestionAgent] Fetching intent system prompt...");
          const system_message = await questionContext();
          //console.log("[QuestionAgent] Intent context received:", system_message);
    
  
          console.log("[QuestionAgent] Sending MCP chat completion request...");
          // MCP mesajı oluştur
          const response = await this.sendAgentCompletion(this.createMCPMessage(
            null, // context_id gerekmiyorsa null, yoksa dinamik atanabilir
            [
              {
                role: "system",
                content: system_message || "Sen bir akıllı asistansın",
                timestamp: new Date().toISOString(),
              },
              {
                role: "user",
                content: human_message,
                timestamp: new Date().toISOString(),
              },
            ],
            false // Stream kullanılmıyor
          ));
    
          console.log("[QuestionAgent] Completion response received:", response);
    
          // MCP yanıtından içeriği al
          const rawResponse = response.messages[0].content;
    
          // JSON’u parse et
          const parsedResponse = this.cleanJSON(rawResponse);

          return parsedResponse;
        } catch (error) {
          console.error("[RecomAgent] Recom analiz hatası:", error);
          return "chat"; // Varsayılan intent, hata durumunda
        }
      }
}

module.exports = () => new QuestionAgent();