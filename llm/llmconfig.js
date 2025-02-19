const { ChatOpenAI } = require("@langchain/openai");
const OpenAI = require("openai")
const connectionLangChain = (model_name, temperature) => {
    return new Promise((resolve, reject) => {
        const model = new ChatOpenAI({ model: model_name, temperature });
        resolve(model)
    })
}
const connection = () => {
    return new Promise(async (resolve, reject) => {
        const openai = new OpenAI(
            {
                apiKey: process.env.OPENAI_API_KEY
            }
        );

        resolve(openai)
    })
}
module.exports = { connection }
