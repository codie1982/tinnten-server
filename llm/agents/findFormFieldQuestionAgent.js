
const findFormFieldQuestionPromt = require("../system_promt/findFormFieldQuestionPromt");
const BaseAgent = require("./BaseAgent");


class FindFormFieldFromFileAgent extends BaseAgent {
  constructor(model = "gpt-3.5-turbo", temperature = 0.2) {
    super(model, temperature);
  }

  async create(decription) {
    try {
      console.log("[FindFormFieldFromFileAgent] Fetching intent system prompt...");
      const system_message = await findFormFieldQuestionPromt();

      // MCP mesajı oluştur
      const mcpMessage = this.createMCPMessage(
        null, // context_id gerekmiyorsa null
        [
          {
            role: "system",
            content: system_message || "Sen bir akıllı asistansın",
            timestamp: new Date().toISOString(),
          },
          {
            role: "user",
            content: decription,
            timestamp: new Date().toISOString(),
          },
        ],
        false // Stream kullanılmıyor
      );

      console.log("[FindFormFieldFromFileAgent] Sending MCP chat completion request...");
      const response = await this.sendAgentCompletion(mcpMessage);

      console.log("[FindFormFieldFromFileAgent] Completion response received:", response);

      // MCP yanıtından içeriği al
      const rawResponse = response.messages[0].content;
      // JSON’u parse et
      const parsedResponse = this.cleanJSON(rawResponse);
      console.log("[FindFormFieldFromFileAgent] Parsed response:", parsedResponse);

      return parsedResponse;
    } catch (error) {
      console.error("[FindFormFieldFromFileAgent] ❌ Ürün oluşturma hatası:", error.message);

      return {
        success: false,
        error: true,
        message: "Ürün oluşturulamadı.",
        reason: error.message || "Bilinmeyen hata",
        fallback: {
          suggestion: "Lütfen ürün adını ve açıklamasını daha açık şekilde girin.",
          example: "Örn: 'Akıllı LED Ampul - Uzaktan Kumandalı, Wi-Fi destekli'",
        },
      };
    }
  }
}

module.exports = FindFormFieldFromFileAgent;