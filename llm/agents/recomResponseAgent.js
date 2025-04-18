const recomResponseSystemPromt = require("../system_promt/recomResponseSystemPromt");
const questionResponseSystemPromt = require("../system_promt/questionResponseSystemPromt");
const ResponseAgent = require("./responseAgent");


class RecomResponseAgent extends ResponseAgent {
    constructor(model = "gpt-3.5-turbo", temperature = 0.2) {
        super(model, temperature);
    }
    // BaseAgent’ın sendAgentCompletionStream’ini override et
    async sendAgentCompletionStream(mcpMessage, onTokenCallback) {
        console.log(`[RecomResponseAgent] Initiating stream for model: ${this.model_name}`);

        // Stream API’sini çağır (örneğin, OpenAI veya başka bir model)
        const stream = await this.model.chat.completions.create({
            model: this.model_name,
            messages: mcpMessage.messages.map((msg) => ({
                role: msg.role,
                content: msg.content,
            })),
            temperature: this.temperature,
            stream: true,
        });

        let finalContent = "";
        const context_id = mcpMessage.context_id || "unknown";

        for await (const chunk of stream) {
            const tokenContent = chunk.choices[0]?.delta?.content || "";
            if (tokenContent) {
                finalContent += tokenContent;
                // Token’ı direkt düz metin olarak gönder, cleanJSON yok
                onTokenCallback({
                    version: mcpMessage.version,
                    context_id,
                    delta: {
                        role: "assistant",
                        content: tokenContent,
                        timestamp: new Date().toISOString(),
                    },
                    finish_reason: null,
                });
            }
        }

        console.log("[RecomResponseAgent] Stream completed with reason: stop");

        // Final MCP mesajını oluştur
        const finalMessage = this.createMCPMessage(
            context_id,
            [
                {
                    role: "assistant",
                    content: finalContent,
                    timestamp: new Date().toISOString(),
                },
            ],
            false,
            { finish_reason: "stop" }
        );

        return finalMessage;
    }
    async setRecomResponseContext(user, userid, conversationid, messages, items) {
        try {
            let human_message = messages.human_message.content || messages
            const system_message = await recomResponseSystemPromt(user, userid, items);

            const mcpMessage = this.createMCPMessage(
                conversationid,
                [
                    {
                        role: "system",
                        content: system_message || "Varsayılan sistem mesajı",
                        timestamp: new Date().toISOString(),
                    },
                    {
                        role: "user",
                        content: human_message,
                        timestamp: new Date().toISOString(),
                    },
                ],
                true
            );


            // Kullanıcı Ön mesaj Gönder
            await this.senSystemMessage(userid, messages);

            const result = await this.sendResponseStream(mcpMessage, async (token) => {
                //console.log("[ChatResponseAgent] MCP token:", token);
                await this.sendStreamToClient(userid, token);
            });

            // Final sonucu gönder
            console.log("[RecomResponseAgent] Final Result", result)
            await this.sendStreamToClient(userid, result);

            return result;
        } catch (error) {
            console.error("[RecomResponseAgent] Error:", error);
            const errorMessage = this.createMCPMessage(
                conversationid,
                [
                    {
                        role: "system",
                        content: "Bağlam oluşturulamadı",
                        timestamp: new Date().toISOString(),
                    },
                ],
                false,
                { error: error.message }
            );
            await this.sendStreamToClient(userid, errorMessage);
            return errorMessage;
        }
    }
    async setQuestionResponseContext(user, userid, conversationid, messages, items) {
        try {
            let human_message = messages.human_message.content || messages
            const system_message = await questionResponseSystemPromt(user, userid, items.questions);

            const mcpMessage = this.createMCPMessage(
                conversationid,
                [
                    {
                        role: "system",
                        content: system_message || "Varsayılan sistem mesajı",
                        timestamp: new Date().toISOString(),
                    },
                    {
                        role: "user",
                        content: human_message,
                        timestamp: new Date().toISOString(),
                    },
                ],
                true
            );


            // Kullanıcı Ön mesaj Gönder
            await this.senSystemMessage(userid, messages);

            const result = await this.sendResponseStream(mcpMessage, async (token) => {
                //console.log("[ChatResponseAgent] MCP token:", token);
                await this.sendStreamToClient(userid, token);
            });

            // Final sonucu gönder
            console.log("[RecomResponseAgent] Final Result", result)
            await this.sendStreamToClient(userid, result);

            return result;
        } catch (error) {
            console.error("[RecomResponseAgent] Error:", error);
            const errorMessage = this.createMCPMessage(
                conversationid,
                [
                    {
                        role: "system",
                        content: "Bağlam oluşturulamadı",
                        timestamp: new Date().toISOString(),
                    },
                ],
                false,
                { error: error.message }
            );
            await this.sendStreamToClient(userid, errorMessage);
            return errorMessage;
        }
    }
}

module.exports = RecomResponseAgent;