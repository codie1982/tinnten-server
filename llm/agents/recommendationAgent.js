const Cost = require("../../lib/cost")
const orientationContext = require("../Context/orientationContext")
const BaseAgent = require("./BaseAgent")

class RecommendationAgent extends BaseAgent {
    async getOrientationContext(user, userid, conversation, human_message) {
        this.system_message = await orientationContext(user, conversation, human_message)
        console.log("[LLMAgent] Orientation context received:", this.system_message)
        console.log("[LLMAgent] Sending chat completion request...")
        const completion = await this.model.chat.completions.create({
            model: this.model_name,
            messages: [
                {
                    role: 'system',
                    content: "Sen bir akıllı öneri asistanısın"
                },
                {
                    role: 'user',
                    content: this.system_message
                }
            ],
            temperature: this.temperature
        });


        console.log("[LLMAgent] Completion response received.")
        console.log("[LLMAgent] Completion.", completion.choices[0].message)

        let response = completion.choices[0].message.content
        console.log("[LLMAgent] Raw response:", response, typeof (response))
        const parseResponse = this.cleanJSON(response);

        let nCost = new Cost(this.model_name)
        let calculate = nCost.calculate(completion.usage.prompt_tokens, completion.usage.completion_tokens)
        return {
            userid: userid,
            conversationid: conversation.conversationid,
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

module.exports = RecommendationAgent