const chatResponseContext = require("../system_promt/chatResponseContext");
const ResponseAgent = require("./responseAgent");


class GeneralChatResponseAgent extends ResponseAgent {
    constructor(model = "gpt-3.5-turbo", temperature = 0.2) {
        super(model, temperature);
    }

    // BaseAgent’ın sendAgentCompletionStream’ini override et
    async sendAgentCompletionStream(mcpMessage, onTokenCallback) {
        console.log(`[ChatResponseAgent] Initiating stream for model: ${this.model_name}`);

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

        console.log("[ChatResponseAgent] Stream completed with reason: stop");

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

    // ToolOrchestrator sonuçlarını birleştiren ve bağlama uygun yanıt üreten metod
    async getChatResponseContext(user, userid, conversationid, messages, summary, orchestratorResults) {
        try {
            const human_message = messages.human_message || "bir cevap hazırlaman gerekiyor";

            // ToolOrchestrator sonuçlarını sistem prompt'una entegre et
            const systemPrompt = this.buildSystemPrompt(user, summary, orchestratorResults);
            console.log("[GeneralChatResponseAgent] System Prompt:", systemPrompt);
            // MCP mesajını oluştur
            const mcpMessage = this.createMCPMessage(
                conversationid,
                [
                    {
                        role: "system",
                        content: systemPrompt,
                        timestamp: new Date().toISOString(),
                    },
                    {
                        role: "user",
                        content: human_message,
                        timestamp: new Date().toISOString(),
                    },
                ],
                true,
                { max_tokens: 1500 }
            );

            // Sistem mesajını gönder (opsiyonel, istemciye bilgi vermek için)
            await this.sendSystemMessage(userid, messages);

            // Akış yanıtını başlat
            const result = await this.sendResponseStream(mcpMessage, async (token) => {
                //console.log("[GeneralChatResponseAgent] MCP token:", token);
                await this.sendStreamToClient(userid, token);
            });

            // Final sonucu gönder
            console.log("[GeneralChatResponseAgent] Final Result:", result);
            await this.sendStreamToClient(userid, result);

            return result;
        } catch (error) {
            console.error("[GeneralChatResponseAgent] Error:", error);
            const errorMessage = this.createMCPMessage(
                conversationid,
                [
                    {
                        role: "system",
                        content: "Bağlam oluşturulamadı veya yanıt üretilemedi",
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

    // Sistem prompt'unu dinamik olarak oluştur
    buildSystemPrompt(user, summary, orchestratorResults) {
        let prompt = `
      SEN TINNTEN'İN SOHBET YANIT MOTORUSUN (CHAT RESPONSE ENGINE).
      
      ### Görevin
      Kullanıcının mesajına ve araçlardan gelen bilgilere dayanarak doğal, akıcı ve bağlama uygun bir yanıt üret.
      - Yanıt, kullanıcıya doğrudan hitap etmeli ve konuşma diline uygun olmalı.
      - Araçlardan gelen ürün ve hizmet bilgilerini yanıtın içine doğal bir şekilde entegre et.
      - Eğer araçlardan bilgi gelmediyse, genel bir sohbet yanıtı üret.
      - Kullanıcıya gereksiz teknik detaylar verme, sadece faydalı bilgileri paylaş.

            ### Kurallar
      - Yanıtın tonu samimi ve yardımcı olmalı.
      - Ürün ve hizmet bilgilerini kullanıcının talebine göre özetle veya detaylandır.
      - Eğer kullanıcının talebi belirsizse, nazikçe netleştirici bir soru sor.
      - Teknik terimler yerine sade bir dil kullan.

    ### Kullanıcı ismi :   ${user?.name || "kullancını"}

    
      ### Kullanıcı ile önceki mesajların bir özeti
      ${summary}
      
      ### Araç Sonuçları `;

        if (orchestratorResults?.products?.length) {
            prompt += `\n#### Ürün ve Hizmet Bilgileri\n`;

            if (orchestratorResults.products?.length) {
                prompt += `**Ürünler**:\n`;
                orchestratorResults.products.forEach((product, index) => {
                    prompt += `- ${index + 1}. ${product.name} (${product.price} TL): ${product.description}\n`;
                });
            }

        } else {
            prompt += `\n#### Ürün ve Hizmet Bilgileri\nHiçbir ürün veya hizmet bulunamadı.\n`;
        }

        if (orchestratorResults?.messages?.length) {
            prompt += `\n#### Araç Mesajları\n`;
            orchestratorResults.messages.forEach((msg, index) => {
                prompt += `- Mesaj ${index + 1}: ${msg.content}\n`;
            });
        }

        prompt += `

    `;

        return prompt.trim();
    }
}

module.exports = GeneralChatResponseAgent;