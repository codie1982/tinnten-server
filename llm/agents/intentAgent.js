
const intentSystemPrompt = require("../system_promt/intentSystemPrompt");
const BaseAgent = require("./BaseAgent");


class IntentAgent extends BaseAgent {
  constructor(model = "gpt-3.5-turbo", temperature = 0.2) {
    super(model, temperature);
  }

  async getIntent(user, human_message, memory = [], scoped = {}) {
    try {
      console.log("[IntentAgent] Fetching intent system prompt...");
      const system_message = await intentSystemPrompt(user, memory, scoped);

      const mcpMessage = this.createMCPMessage(
        null,
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
        false
      );

      console.log("[IntentAgent] Sending MCP chat completion request...");
      const response = await this.sendAgentCompletion(mcpMessage);

      console.log("[IntentAgent] Completion response received:", response);

      const rawResponse = response.messages[0].content;
      const parsedIntent = this.cleanJSON(rawResponse);
      console.log("[IntentAgent] Parsed intent:", parsedIntent);

      const validIntent = this.validateIntent(parsedIntent, human_message);
      return validIntent;
    } catch (error) {
      console.error("[IntentAgent] Intent analiz hatası:", error);
      return {
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
        context: {
          id: "yok",
          type: "yok",
          state: "initial",
          lockContext: false,
          metadata: {},
        },
        ui_changes: { show: [], hide: [], update: {} }
      };
    }
  }

  validateIntent(intent, rawQuery = "") {
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
      "offer_search",
      "offer_request",
      "offer_form",
      "offer_feedback",
      "offer_confirm",
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
      "OfferSearchTool",
      "OfferRequestTool",
      "OfferFormTool",
      "OfferFeedbackTool",
      "OfferConfirmTool",
      null,
    ];

    if (!intent || intent.confidence < 0.15) return null;
    if (!validIntents.includes(intent.intent)) return null;
    if (!validTools.includes(intent.tool)) return null;

    // priority default ayarı
    if (intent.priority < 1 || intent.priority > 3) {
      intent.priority = 1;
    }

    // Koşullar
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

    // nextTool
    if (intent.nextTool) {
      if (
        !validTools.includes(intent.nextTool.tool) ||
        typeof intent.nextTool.query !== "string" ||
        typeof intent.nextTool.condition !== "string"
      ) {
        delete intent.nextTool;
      }
    }

    // retryTool
    if (intent.retryTool) {
      if (
        !validTools.includes(intent.retryTool.tool) ||
        typeof intent.retryTool.query !== "string" ||
        typeof intent.retryTool.maxRetries !== "number"
      ) {
        delete intent.retryTool;
      }
    }

    // Varsayılan query alanı yoksa user mesajı gir
    if (!intent.query) {
      intent.query = rawQuery;
    }

    return intent;
  }
}

module.exports = IntentAgent;