const { conversation } = require("../../controller/llmController/conversationControlller")
const Cost = require("../../lib/cost")
const chatResponseContext = require("../Context/chatResponseContext")
const BaseAgent = require("./BaseAgent")
const ResponseAgent = require("./responseAgent")

class ChatResponseAgent extends ResponseAgent {
    async getChatResponseContext(user, userid, conversationid, human_message) {

        this.system_message = await chatResponseContext(user, userid, conversationid, human_message)
        console.log("[ChatResponseAgent] Response System Message received:", this.system_message)
        console.log("[ChatResponseAgent] Sending chat completion request...")
        const completion = await this.model.chat.completions.create({
            model: this.model_name,
            messages: [
                {
                    role: 'system',
                    content: "Sen bir Akıllı chatbotsun"
                },
                {
                    role: 'user',
                    content: this.system_message
                }
            ],
            temperature: this.temperature
        });
        console.log("[ChatResponseAgent] Completion response received.")
        let response = completion.choices[0].message.content
        console.log("[ChatResponseAgent] Raw response:", response)
        const parseResponse = this.cleanMarkdown(response);

        let nCost = new Cost(this.model_name)
        let calculate = nCost.calculate(completion.usage.prompt_tokens, completion.usage.completion_tokens)
        return {
            model: completion.model,
            userid: userid,
            conversationid: conversationid,
            content: { system_message: parseResponse },
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

module.exports = ChatResponseAgent