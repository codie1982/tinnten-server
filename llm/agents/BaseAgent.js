const { connection } = require("../../llm/llmconfig")

class BaseAgent {
    constructor(model = "gpt-3.5-turbo", tempature = 0.2) {
        this.model = model
        this.tempature = tempature
    }
    async start(model_name, temperature) {
        this.model = await connection()
        this.model_name = model_name
        this.temperature = temperature
    }
}
module.exports = BaseAgent