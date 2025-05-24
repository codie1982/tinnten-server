
const findFormFieldPrompt = require("../system_promt/findFormFieldPrompt");
const BaseAgent = require("./BaseAgent");


class FindFormFieldFromFileAgent extends BaseAgent {
  constructor(model = "gpt-3.5-turbo", temperature = 0.2) {
    super(model, temperature);
  }

  async create(human_message) {
    try {
      console.log("[FindProduct] Fetching intent system prompt...");
      const system_message = await findFormFieldPrompt();

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
            content: human_message,
            timestamp: new Date().toISOString(),
          },
        ],
        false // Stream kullanılmıyor
      );

      console.log("[FindProduct] Sending MCP chat completion request...");
      const response = await this.sendAgentCompletion(mcpMessage);

      console.log("[FindProduct] Completion response received:", response);

      // MCP yanıtından içeriği al
      const rawResponse = response.messages[0].content;
      // JSON’u parse et
      const parsedResponse = this.cleanJSON(rawResponse);
      console.log("[FindProduct] Parsed response:", parsedResponse);

      return parsedResponse;
    } catch (error) {
      console.error("[FindProduct] ❌ Ürün oluşturma hatası:", error.message);

      return {
        success: false,
        error: true,
        message: "Ürün oluşturulamadı.",
        reason: error.message || "Bilinmeyen hata",
        originalInput: human_message,
        fallback: {
          suggestion: "Lütfen ürün adını ve açıklamasını daha açık şekilde girin.",
          example: "Örn: 'Akıllı LED Ampul - Uzaktan Kumandalı, Wi-Fi destekli'",
        },
      };
    }
  }
}

module.exports = FindFormFieldFromFileAgent;