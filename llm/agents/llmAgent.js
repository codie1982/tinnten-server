const Cost = require("../../lib/cost")
const orientationContext = require("../Context/orientationContext")
const BaseAgent = require("./BaseAgent")

class LLMAgent extends BaseAgent{
    async getOrientationContext(memory, human_message,userContext,qna) {
        this.context = await orientationContext(memory, human_message,userContext,qna)

        const completion = await this.model.chat.completions.create({
            messages: [{ role: "assistant", content: this.context }],
            model: this.model_name,
            temperature: this.temperature,
            store: true,
        });

        let response = completion.choices[0].message.content
        console.log("response", response)
        const parseResponse = JSON.parse(this.cleanJSON(response));
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
    cleanJSON(responseText) {
        return responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    }
}

module.exports = LLMAgent