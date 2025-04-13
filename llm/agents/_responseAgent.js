const Cost = require("../../lib/cost")
const responseContext = require("../system_promt/responseContext")
const BaseAgent = require("./BaseAgent")

class ResponseAgent extends BaseAgent {
    async getResponseContext(search_context, mainProductList,auxiliaryProductList, serviceList) {
        
        this.system_message = await responseContext(search_context, mainProductList,auxiliaryProductList, serviceList)
        console.log("[ResponseAgent] Response System Message received:", this.system_message)
        console.log("[ResponseAgent] Sending chat completion request...")
        const completion = await this.model.chat.completions.create({
            model: this.model_name,
            messages: [
                {
                    role: 'system',
                    content: "Sen bir Akıllı Chatbotsun"
                },
                {
                    role: 'user',
                    content: this.system_message
                }
            ],
            temperature: this.temperature
        });


        console.log("[ResponseAgent] Completion response received.")
        let response = completion.choices[0].message.content
        console.log("[ResponseAgent] Raw response:", response)
        const parseResponse = this.cleanMarkdown(response);

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

}

module.exports = ResponseAgent