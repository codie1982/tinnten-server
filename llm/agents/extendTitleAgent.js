
const extentTitlesPrompt = require("../system_promt/extentTitlePrompt.js");
const BaseAgent = require("./BaseAgent.js");


class ExtendTitlesAgent extends BaseAgent {
  constructor(model = "gpt-3.5-turbo", temperature = 0.2) {
    super(model, temperature);
  }

  async find(user, human_message,maxChars = 4000) {
    try {
      console.log("[FindProduct] Fetching intent system prompt...");
      const system_message = await extentTitlesPrompt();

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
            content: this.prepareLLMContext(human_message,maxChars),
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
      console.error("[FindProduct] Intent analiz hatası:", error);
      return [
        {
          intent: "chat",
          tool: null,
          confidence: 0.8,
          priority: 3,
          related_id: null,
          query: human_message,
          fallback: {
            tool: "QuestionTool",
            query: "Ne hakkında konuşmak istiyorsunuz?",
          },
        },
      ];
    }
  }
  cleanPdfTextAdvanced(rawText) {
    return rawText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !/^•\s*$/.test(line)) // Boş noktalı satırı çıkar
      .join('\n');
  }
  prepareLLMContext(text, maxChars = 4000) {
    const cleaned = this.cleanPdfTextAdvanced(text);
    return cleaned.length > maxChars ? cleaned.slice(0, maxChars) : cleaned;
  }
}

module.exports = ExtendTitlesAgent;