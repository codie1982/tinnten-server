const Cost = require("../../lib/cost")
const memoryContext = require("../Context/memoryContext")
const BaseAgent = require("./BaseAgent")

class MemoryAgent extends BaseAgent {



    async getMemory(memory) {
        this.context = await memoryContext(memory)

        const completion = await this.model.chat.completions.create({
            messages: [{ role: "assistant", content: this.context }],
            model: this.model_name,
            temperature: this.temperature,
            store: true,
        });

        let response = completion.choices[0].message.content
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

module.exports = MemoryAgent