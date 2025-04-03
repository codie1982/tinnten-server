const Cost = require("../../lib/cost")
const orientationContext = require("../Context/orientationContext")
const BaseAgent = require("./BaseAgent")

class LLMAgent extends BaseAgent {
    async getOrientationContext(user,userid, conversation, human_message) {
        this.context = await orientationContext(user, conversation, human_message)
        console.log("[LLMAgent] Orientation context received:", this.context)
        console.log("[LLMAgent] Sending chat completion request...")
        const completion = await this.model.chat.completions.create({
            messages: [{ role: "assistant", content: this.context }],
            model: this.model_name,
            temperature: this.temperature,
            store: true,
        });
        console.log("[LLMAgent] Completion response received.")
        let response = completion.choices[0].message.content
        console.log("[LLMAgent] Raw response:", response)
        const parseResponse = JSON.parse(this.cleanJSON(response));

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
    cleanJSON(responseText) {
        return responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    }
}

module.exports = LLMAgent