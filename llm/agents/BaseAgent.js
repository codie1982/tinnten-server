const { connection } = require("../../llm/llmconfig");
const { v4: uuidv4 } = require("uuid");
const Cost = require("../../lib/Cost.js");
class BaseAgent {
  constructor(model = "gpt-3.5-turbo", temperature = 0.2) {
    this.model_name = model;
    this.temperature = temperature;
    this.model = null;
  }

  async start(model_name = this.model_name, temperature = this.temperature) {
    this.model = await connection(model_name); // Model-specific bağlantı
    this.model_name = model_name;
    this.temperature = temperature;
    console.log(`[BaseAgent] Model initialized: ${this.model_name}`);
  }

  // MCP mesajı oluştur
  createMCPMessage(context_id, messages, stream = false, parameters = {}) {
    return {
      version: "1.0",
      context_id: context_id || uuidv4(),
      messages,
      stream,
      model: this.model_name,
      parameters: {
        temperature: this.temperature,
        max_tokens: parameters.max_tokens || 1000,
        ...parameters,
      },
    };
  }

  // MCP yanıtını parse et
  parseMCPResponse(response) {
    try {
      if (typeof response === "object") return response;
      return JSON.parse(response);
    } catch (error) {
      console.error("[BaseAgent] MCP parse error:", error);
      return {
        system_message: "Yanıt çözümlenemedi",
        action: "none",
        products: [],
        services: [],
      };
    }
  }

  cleanJSON(responseText) {
    try {
      if (typeof responseText === "object") return responseText;
      // 1) kod bloklarını temizle
      const txt = responseText
        .replace(/```(?:json)?|\*\*\*json/gi, "")   // 1) ```json … 2) ***json
        .trim();

      // 2) metin içinde ilk '[' / '{' karakterinden itibaren kes
      const pos = Math.min(
        ...["[", "{"].map(ch => txt.indexOf(ch)).filter(i => i >= 0)
      );
      if (pos > 0) txt = txt.slice(pos);

      return JSON.parse(txt);
    } catch (error) {
      console.error("[BaseAgent] JSON parse error:", error);
      return {
        system_message: "Cevap çözümlenemedi",
        action: "none",
        products: [],
        services: [],
      };
    }
  }

  cleanMarkdown(responseText) {
    try {
      if (typeof responseText === "object") return responseText;
      let cleaned = responseText
        .replace(/```(json|markdown)?/gi, "")
        .replace(/```/g, "")
        .trim();
      console.log("[BaseAgent] cleanMarkdown:", cleaned);
      return cleaned;
    } catch (error) {
      console.error("[BaseAgent] Markdown clean error:", error);
      return {
        system_message: "Cevap çözümlenemedi",
        action: "none",
        products: [],
        services: [],
      };
    }
  }

  async sendAgentCompletion(mcpMessage) {
    console.log(`[BaseAgent] Sending MCP chat completion to model: ${this.model_name}`);

    if (!this.model) {
      throw new Error("Model not initialized. Call start() first.");
    }

    try {
      const messages = mcpMessage.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const completion = await this.model.chat.completions.create({
        model: mcpMessage.model || this.model_name,
        messages,
        temperature: mcpMessage.parameters.temperature || this.temperature,
        max_tokens: mcpMessage.parameters.max_tokens,
      });

      console.log("[BaseAgent] Chat completion received.");
      const responseText = completion.choices[0].message.content;
      const finishReason = completion.choices[0].finish_reason;
      const tokens = completion.usage;

      const parsedContent = this.cleanJSON(responseText);
     
      const costCalc = new Cost(this.model_name).calculate(
        tokens.prompt_tokens,
        tokens.completion_tokens
      );

      return this.createMCPMessage(mcpMessage.context_id, [
        {
          role: "assistant",
          content: parsedContent,
          timestamp: new Date().toISOString(),
        },
      ], false, {
        finish_reason: finishReason,
        tokens: {
          prompt_tokens: tokens.prompt_tokens,
          completion_tokens: tokens.completion_tokens,
          total_tokens: tokens.total_tokens,
        },
        cost: {
          promptCost: costCalc.promptCost,
          completionCost: costCalc.completionCost,
          totalCost: costCalc.totalCost,
          unit: "DL",
        },
      });
    } catch (error) {
      console.error("[BaseAgent] Chat completion error:", error);
      return this.createMCPMessage(mcpMessage.context_id, [
        {
          role: "system",
          content: "Cevap alınamadı",
          timestamp: new Date().toISOString(),
        },
      ], false, { error: error.message });
    }
  }

  async sendAgentCompletionStream(mcpMessage, onTokenCallback) {
    console.log(`[BaseAgent] Sending MCP streaming chat completion to model: ${this.model_name}`);

    if (!this.model) {
      throw new Error("Model not initialized. Call start() first.");
    }

    try {
      const messages = mcpMessage.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const stream = await this.model.chat.completions.create(
        {
          model: mcpMessage.model || this.model_name,
          messages,
          temperature: mcpMessage.parameters.temperature || this.temperature,
          max_tokens: mcpMessage.parameters.max_tokens,
          stream: true,
        },
        { responseType: "stream" }
      );

      let accumulatedContent = "";
      let tokens = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || "";
        const finishReason = chunk.choices[0]?.finish_reason;

        if (delta) {
          accumulatedContent += delta;
          const cleanedDelta = this.cleanMarkdown(delta);

          if (onTokenCallback) {
            onTokenCallback({
              version: "1.0",
              context_id: mcpMessage.context_id,
              delta: {
                role: "assistant",
                content: cleanedDelta,
                timestamp: new Date().toISOString(),
              },
              finish_reason: null,
            });
          }
        }

        if (finishReason) {
          console.log(`[BaseAgent] Stream completed with reason: ${finishReason}`);
          tokens.completion_tokens = Math.round(accumulatedContent.length / 4);
          const costCalc = new Cost(this.model_name).calculate(
            tokens.prompt_tokens,
            tokens.completion_tokens
          );

          return this.createMCPMessage(mcpMessage.context_id, [
            {
              role: "assistant",
              content: this.cleanJSON(accumulatedContent),
              timestamp: new Date().toISOString(),
            },
          ], false, {
            finish_reason: finishReason,
            tokens: {
              prompt_tokens: tokens.prompt_tokens,
              completion_tokens: tokens.completion_tokens,
              total_tokens: tokens.prompt_tokens + tokens.completion_tokens,
            },
            cost: {
              promptCost: costCalc.promptCost,
              completionCost: costCalc.completionCost,
              totalCost: costCalc.totalCost,
              unit: "DL",
            },
          });
        }
      }
    } catch (error) {
      console.error("[BaseAgent] Stream error:", error);
      return this.createMCPMessage(mcpMessage.context_id, [
        {
          role: "system",
          content: "Stream sırasında hata oluştu",
          timestamp: new Date().toISOString(),
        },
      ], false, { error: error.message });
    }
  }
}

module.exports = BaseAgent;