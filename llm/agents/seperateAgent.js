const Cost = require("../../lib/cost")
const { seperateContext } = require("../system_promt/seperateContext")
const BaseAgent = require("./BaseAgent")

class SeperateAgent extends BaseAgent {
    async getSeperateContext(search_context, similarProducts) {
        this.system_message = await seperateContext(similarProducts, search_context)

        console.log("[SeperateAgent] Response System Message received:", this.system_message)
        console.log("[SeperateAgent] Sending chat completion request...")
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


        console.log("[SeperateAgent] Completion response received.")
        let response = completion.choices[0].message.content

        console.log("[SeperateAgent] Raw response:", response)

        const parseResponse = this.cleanJSON(response);
        console.log("[SeperateAgent] parseResponse response:", parseResponse)


        // Filter similarProducts based on matching title with products in seperateResponseContext
        let mainProductList = [];
        parseResponse.mainproductList.forEach(item => {
            similarProducts.forEach(simProd => {
                if (item.title === simProd.title) {
                    mainProductList.push(simProd);
                }
            });
        });

        let auxiliaryProductList = [];
        parseResponse.auxiliarymainList.forEach(item => {
            similarProducts.forEach(simProd => {
                if (item.title === simProd.title) {
                    auxiliaryProductList.push(simProd);
                }
            });
        });

        let nCost = new Cost(this.model_name)
        let calculate = nCost.calculate(completion.usage.prompt_tokens, completion.usage.completion_tokens)



        return {
            model: completion.model,
            content: { mainProductList, auxiliaryProductList },
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

module.exports = SeperateAgent