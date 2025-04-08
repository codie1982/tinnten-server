const { connection } = require("../../llm/llmconfig")

class BaseAgent {
    constructor(model = "gpt-3.5-turbo", tempature = 0.2) {
        this.model = model
        this.tempature = tempature
    }
    async start(model_name, temperature) {
        this.model = await connection()
        this.model_name = model_name
        this.temperature = temperature
    }

    cleanJSON(responseText) {
        try {
            // Eğer zaten bir nesne ise (bazı durumlarda model JSON olarak parse edilmiş dönebilir)
            if (typeof responseText === 'object') {
                return responseText;
            }

            const cleaned = responseText
                .replace(/```json|```|\*\*\*json|\*\*\*/gi, '')  // Markdown etiketlerini temizle
                .trim();

            return JSON.parse(cleaned);
        } catch (error) {
            return {
                system_message: "Cevap çözümlenemedi",
                action: "none",
                products: [],
                services: []
            };
        }
    }

    cleanMarkdown(responseText) {
        try {
            // Eğer zaten bir nesne ise (örneğin modelden JSON olarak geldiyse)
            if (typeof responseText === 'object') {
                return responseText;
            }

            // Markdown etiketlerini temizle
            let cleaned = responseText
                .replace(/```(json|markdown)?/gi, '') // baştaki ```json, ```markdown vb.
                .replace(/```/g, '')                  // sondaki ```
                .trim();


            console.log("cleanMarkdown", cleaned)
            return cleaned;

        } catch (error) {
            return {
                system_message: "Cevap çözümlenemedi",
                action: "none",
                products: [],
                services: []
            };
        }
    }
}
module.exports = BaseAgent

/**
 * // Eğer string içinde doğrudan JSON varsa parse etmeye çalış
            if (cleaned.startsWith('{') || cleaned.startsWith('[')) {
                return JSON.parse(cleaned);
            }
    
            // Değilse: markdown'ı parçala ve özel alanlara ayır
            const lines = cleaned.split('\n');
            const result = {
                system_message: '',
                products: [],
                services: [],
            };
    
            for (let line of lines) {
                line = line.trim();
    
                // system_response alanı
                const systemMatch = line.match(/^\*\*system_response\*\*\s*:\s*(.+)$/i);
                if (systemMatch) {
                    result.system_message += systemMatch[1].trim();
                    continue;
                }
    
                // Ürünler (Yardımcı ürün satırları)
                const productMatch = line.match(/^- \*\*(.+?)\*\);
                if (productMatch) {
                    result.products.push(productMatch[1].trim());
                    continue;
                }
            }
 */