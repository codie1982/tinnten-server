const { connection } = require("../../llm/llmconfig")

class BaseAgent {
    constructor(model, tempature) {
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