
const intentSystemPrompt = require("../system_promt/intentSystemPrompt");
const BaseAgent = require("./BaseAgent");


class IntentAgent extends BaseAgent {
  constructor(model = "gpt-3.5-turbo", temperature = 0.2) {
    super(model, temperature);
  }

  async getIntent(user, human_message, memory = [], scoped = {}) {
    try {
      console.log("[IntentAgent] Fetching intent system prompt...");
      const system_message = await intentSystemPrompt(user, human_message, memory, scoped);

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

      console.log("[IntentAgent] Sending MCP chat completion request...");
      const response = await this.sendAgentCompletion(mcpMessage);

      console.log("[IntentAgent] Completion response received:", response);

      // MCP yanıtından içeriği al
      const rawResponse = response.messages[0].content;
      // JSON’u parse et
      const parsedResponse = this.cleanJSON(rawResponse);
      console.log("[IntentAgent] Parsed response:", parsedResponse);

      // Şemayı doğrula
      const validIntents = this.validateIntents(parsedResponse);
      return validIntents;
    } catch (error) {
      console.error("[IntentAgent] Intent analiz hatası:", error);
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


  validateIntents(intents) {
    // Geçerli intent ve tool listesi
    const validIntents = [
      "recommendation",
      "production_info",
      "services_info",
      "search_product",
      "search_service",
      "chat",
      "chatabouthproduct",
      "chatabouthservices",
      "supplier_search",
    ];
    const validTools = [
      "ProductSuggestTool",
      "ProductDetailTool",
      "ServiceDetailTool",
      "ProductSearchTool",
      "ServiceSearchTool",
      "ProductUsageTool",
      "ServiceUsageTool",
      "SupplierSearchTool",
      "QuestionTool",
      null,
    ];

    return intents.filter((intent) => {
      // confidence kontrolü
      if (intent.confidence < 0.15) return false;
      // intent ve tool doğrulama
      if (!validIntents.includes(intent.intent)) return false;
      if (!validTools.includes(intent.tool)) return false;
      // priority 1-3 arası olmalı
      if (intent.priority < 1 || intent.priority > 3) intent.priority = 1;
      // conditions doğrulama
      if (intent.conditions) {
        intent.conditions = intent.conditions.filter((cond) => {
          return (
            typeof cond.condition === "string" &&
            validTools.includes(cond.tool) &&
            typeof cond.query === "string" &&
            (cond.params === undefined || typeof cond.params === "object")
          );
        });
      }
      // nextTool doğrulama
      if (intent.nextTool) {
        if (
          !validTools.includes(intent.nextTool.tool) ||
          typeof intent.nextTool.query !== "string" ||
          typeof intent.nextTool.condition !== "string"
        ) {
          delete intent.nextTool;
        }
      }
      // retryTool doğrulama
      if (intent.retryTool) {
        if (
          !validTools.includes(intent.retryTool.tool) ||
          typeof intent.retryTool.query !== "string" ||
          typeof intent.retryTool.maxRetries !== "number"
        ) {
          delete intent.retryTool;
        }
      }
      return true;
    });
  }
}

module.exports = IntentAgent;