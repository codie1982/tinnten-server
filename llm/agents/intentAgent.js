
const intentSystemPromt = require("../system_promt/intentSystemPromt");
const BaseAgent = require("./BaseAgent");


class IntentAgent extends BaseAgent {
  constructor(model = "gpt-3.5-turbo", temperature = 0.2) {
    super(model, temperature);
  }

  async getIntent(user, userid, human_message) {
    try {
      console.log("[IntentAgent] Fetching intent system prompt...");
      const system_message = await intentSystemPromt(user, human_message);
      console.log("[IntentAgent] Intent context received:", system_message);

      // MCP mesajı oluştur
      const mcpMessage = this.createMCPMessage(
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
      );

      console.log("[IntentAgent] Sending MCP chat completion request...");
      const response = await this.sendChatCompletion(mcpMessage);

      console.log("[IntentAgent] Completion response received:", response);

      // MCP yanıtından içeriği al
      const rawResponse = response.messages[0].content;
      console.log("[IntentAgent] Raw response:", rawResponse, typeof rawResponse);

      // JSON’u parse et
      const parsedResponse = this.cleanJSON(rawResponse);
      console.log("[IntentAgent] Parsed response:", parsedResponse);

      return parsedResponse.intent;
    } catch (error) {
      console.error("[IntentAgent] Intent analiz hatası:", error);
      return "chat"; // Varsayılan intent, hata durumunda
    }
  }
}

module.exports = IntentAgent;