const OpenAI = require("openai")
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


/**
 * 
 */