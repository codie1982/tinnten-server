const Cost = require("../../lib/cost")
const intentContext = require("../Context/intentContext")
const BaseAgent = require("./BaseAgent")

class IntentAgent extends BaseAgent {
    async getIntent(user, human_message) {
        this.system_message = await intentContext(user,human_message)
        console.log("[IntentAgent] Intent context received:", this.system_message)
        console.log("[IntentAgent] Sending chat completion request...")
        const completion = await this.model.chat.completions.create({
            model: this.model_name,
            messages: [
                {
                    role: 'system',
                    content: "Sen bir akıllı assistansın"
                },
                {
                    role: 'user',
                    content: this.system_message
                }
            ],
            temperature: this.temperature
        });


        console.log("[IntentAgent] Completion response received.")
        console.log("[IntentAgent] Completion.", completion.choices[0].message)

        let response = completion.choices[0].message.content
        console.log("[IntentAgent] Raw response:", response, typeof (response))
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
}

module.exports = IntentAgent