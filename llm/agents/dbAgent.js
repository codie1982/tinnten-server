const Cost = require("../../lib/cost")
const { productDBContext, servicesDBContext } = require("../Context/dbContext")
const BaseAgent = require("./BaseAgent")

class DBAgent extends BaseAgent {
    async getProductDBContext(search_context, vector, limit) {
        this.system_message = await productDBContext(limit)

        console.log("[DBAgent] Response System Message received:", this.system_message)
        console.log("[DBAgent] Sending chat completion request...")
        const completion = await this.model.chat.completions.create({
            model: this.model_name,
            messages: [
                {
                    role: 'system',
                    content: this.system_message
                },
                {
                    role: 'user',
                    content: search_context
                }
            ],
            temperature: this.temperature
        });


        console.log("[DBAgent] Completion response received.")
        let response = completion.choices[0].message.content

        console.log("[DBAgent] Raw response:", response)

        const parseResponse = this.cleanProductDbJSON(response, vector);
        console.log("[DBAgent] parseResponse response:", parseResponse)


        let nCost = new Cost(this.model_name)
        let calculate = nCost.calculate(completion.usage.prompt_tokens, completion.usage.completion_tokens)
        return {
            model: completion.model,
            content: parseResponse,
            finish_reason: completion.choices[0].finish_reason,
            tokens: {
                prompt_tokens: completion.usage.prompt_tokens,
                completion_tokens: completion.usage.completion_tokens,
                total_tokens: completion.usage.total_tokens,
            },
            cost: {
                promptCost: calculate.promptCost,
                completionCost: calculate.completionCost,
                totalCost: calculate.totalCost,
                unit: "DL"
            }
        }
    }

    async getServicesDBContext(search_context) {
        this.system_message = await servicesDBContext(search_context)

        console.log("[DBAgent] Response System Message received:", this.system_message)
        console.log("[DBAgent] Sending chat completion request...")
        const completion = await this.model.chat.completions.create({
            model: this.model_name,
            messages: [
                {
                    role: 'system',
                    content: this.system_message
                },
                {
                    role: 'user',
                    content: ""
                }
            ],
            temperature: this.temperature
        });


        console.log("[DBAgent] Completion response received.")
        let response = completion.choices[0].message.content
        console.log("[DBAgent] Raw response:", response, typeof (response))
        const parseResponse = this.cleanJSON(response);

        let nCost = new Cost(this.model_name)
        let calculate = nCost.calculate(completion.usage.prompt_tokens, completion.usage.completion_tokens)
        return {
            model: completion.model,
            content: parseResponse,
            finish_reason: completion.choices[0].finish_reason,
            tokens: {
                prompt_tokens: completion.usage.prompt_tokens,
                completion_tokens: completion.usage.completion_tokens,
                total_tokens: completion.usage.total_tokens,
            },
            cost: {
                promptCost: calculate.promptCost,
                completionCost: calculate.completionCost,
                totalCost: calculate.totalCost,
                unit: "DL"
            }
        }
    }

    cleanProductDbJSON(responseText, vector) {
        try {
            if (typeof responseText === 'object') return responseText;
    
            const vectorStr = JSON.stringify(vector); // [0.1, 0.2, ...]
            
            // const cleaned = responseText
            //     .replace(/```json|```|\*\*\*json|\*\*\*/gi, '')
            //     .replace(/"queryVector": "VECTOR_EMBEDDING_PLACEHOLDER"/, `"queryVector": ${vectorStr}`) // ⬅️ önemli fark
            //     .replace(/LIMIT_PLACEHOLDER/g, '___LIMIT___') 
            //     .trim();
                

                const cleaned = responseText
                .replace(/```json|```|\*\*\*json|\*\*\*/gi, '')
                .replace(/"queryVector": "VECTOR_EMBEDDING_PLACEHOLDER"/, `"queryVector": ${vectorStr}`) // ⬅️ önemli fark
                .trim();
    
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

module.exports = DBAgent