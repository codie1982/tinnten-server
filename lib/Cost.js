const modelPricing = {
    "gpt-4o": { prompt: 0.005, completion: 0.015 },
    "gpt-4-turbo": { prompt: 0.01, completion: 0.03 },
    "gpt-3.5-turbo": { prompt: 0.0005, completion: 0.0015 }
};

class Cost {
    constructor(model = "gpt-4o") {
        if (!modelPricing[model]) {
            throw new Error(`Bilinmeyen model: ${model}`);
        }
        this.model = model;
        this.pricePerKPrompt = modelPricing[model].prompt;
        this.pricePerKCompletion = modelPricing[model].completion;
    }

    calculate(promptTokens, completionTokens) {
        const promptCost = (promptTokens / 1000) * this.pricePerKPrompt;
        const completionCost = (completionTokens / 1000) * this.pricePerKCompletion;
        const totalCost = promptCost + completionCost;
        return {
            promptCost: parseFloat(promptCost.toFixed(10)),
            completionCost: parseFloat(completionCost.toFixed(10)),
            totalCost: parseFloat(totalCost.toFixed(10))
        };
    }
}

module.exports = Cost;