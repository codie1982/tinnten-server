const Cost = require("../../lib/cost")
const summarizeContext = require("../system_promt/summarizeContext")
const BaseAgent = require("./BaseAgent")

class SummarizeAgent extends BaseAgent {
    async getSummarize(conversation) {
        this.context = await summarizeContext(conversation)
        console.log("context", this.context)
        const completion = await this.model.chat.completions.create({
            messages: [{ role: "assistant", content: this.context }],
            model: this.model_name,
            temperature: this.temperature,
            store: true,
        });

        let response = completion.choices[0].message.content
        console.log("response", response)
        let nCost = new Cost(this.model_name)
        let calculate = nCost.calculate(completion.usage.prompt_tokens, completion.usage.completion_tokens)

        return {
            model: completion.model,
            content: response,
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

module.exports = SummarizeAgent