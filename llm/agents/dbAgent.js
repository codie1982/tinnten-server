const { productDBContext, servicesDBContext } = require("../system_promt/dbContext")
const BaseAgent = require("./BaseAgent")
class DBAgent extends BaseAgent {
    async getAggregateForProduct(search_context, vector, limit) {
        try {
            console.log("[DBAgent] Fetching intent system prompt...");
            const system_message = await productDBContext(limit);
            //console.log("[DBAgent] Intent context received:", system_message);


            console.log("[DBAgent] Sending MCP chat completion request...");
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
                        content: search_context,
                        timestamp: new Date().toISOString(),
                    },
                ],
                false // Stream kullanılmıyor
            ));

            console.log("[DBAgent] Completion response received:", response);

            // MCP yanıtından içeriği al
            const rawResponse = response.messages[0].content;


            // JSON’u parse et
            //const parsedResponse = this.cleanProductDbJSON(rawResponse, vector);
            rawResponse.agg[0]["$vectorSearch"].queryVector = vector

            return rawResponse;
        } catch (error) {
            console.error("[DBAgent] Recom analiz hatası:", error);
            return "chat"; // Varsayılan intent, hata durumunda
        }
    }

    async getAggregateForServices(search_context, vector, limit) {
        try {
            console.log("[DBAgent] Fetching intent system prompt...");
            const system_message = await servicesDBContext(limit);
            //console.log("[DBAgent] Intent context received:", system_message);


            console.log("[DBAgent] Sending MCP chat completion request...");
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
                        content: search_context,
                        timestamp: new Date().toISOString(),
                    },
                ],
                false // Stream kullanılmıyor
            ));

            console.log("[DBAgent] Completion response received:", response);

            // MCP yanıtından içeriği al
            const rawResponse = response.messages[0].content;

            // JSON’u parse et
            rawResponse.agg[0]["$vectorSearch"].queryVector = vector

            return rawResponse;
        } catch (error) {
            console.error("[DBAgent] Recom analiz hatası:", error);
            return "chat"; // Varsayılan intent, hata durumunda
        }
    }

    cleanProductDbJSON(responseText, vector) {
        try {
            if (typeof responseText === 'object') return responseText;

            const vectorStr = JSON.stringify(vector); // [0.1, 0.2, ...]


            const cleaned = responseText
                .replace(/```json|```|\*\*\*json|\*\*\*/gi, '')
                .replace(/"queryVector": "VECTOR_EMBEDDING_PLACEHOLDER"/, `"queryVector": ${vectorStr}`) // ⬅️ önemli fark
                .trim();
            console.log("cleaned", cleaned)
            const parsed = JSON.parse(cleaned);

            // LIMIT sayı olarak yerleştirilir

            // if (Array.isArray(parsed.agg)) {
            //     parsed.agg = parsed.agg.map(stage => {
            //         if (stage.$vectorSearch && stage.$vectorSearch.limit === '___LIMIT___') {
            //             stage.$vectorSearch.limit = Number(limit);
            //         }
            //         return stage;
            //     });
            // }

            return parsed;
        } catch (error) {
            console.error("JSON parsing error:", error.message);
            return {
                system_message: "Cevap çözümlenemedi",
                action: "none",
                products: [],
                services: []
            };
        }
    }
}

module.exports =  () => new DBAgent();