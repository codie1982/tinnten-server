const BaseAgent = require("./BaseAgent")
const summarizeContext = require("../system_promt/summarizeContext")

class SummarizeAgent extends BaseAgent {
    async summarize(messages) {
        try {
            console.log("[RecomAgent] Fetching intent system prompt...");
            const system_message = await summarizeContext(messages);
            //console.log("[RecomAgent] Intent context received:", system_message);


            console.log("[RecomAgent] Sending MCP chat completion request...");
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
                        content: "Önceki konuşmaların bir özetini çıkarmalısın.",
                        timestamp: new Date().toISOString(),
                    },
                ],
                false // Stream kullanılmıyor
            ));

            console.log("[RecomAgent] Completion response received:", response);

            // MCP yanıtından içeriği al
            const rawResponse = response.messages[0].content;
            console.log("[RecomAgent] Raw response:", rawResponse, typeof rawResponse);

            // JSON’u parse et
            const parsedResponse = this.cleanJSON(rawResponse);
            console.log("[RecomAgent] Parsed response:", parsedResponse);

            return parsedResponse;
        } catch (error) {
            console.error("[RecomAgent] Recom analiz hatası:", error);
            return "chat"; // Varsayılan intent, hata durumunda
        }
    }
}

module.exports = () => new SummarizeAgent();