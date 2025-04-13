const InformationProcessor = require("./InformationProcessor.js");
const axios = require("axios");

const Product = require("../../models/Product.js");
const Service = require("../../models/Services.js");
const ProductDB = require("../../db/ProductsDB.js");
const ServicesDB = require("../../db/ServicesDB.js");
const Recommendation = require("../../models/Recommendation.js");
const RecommendationDB = require("../../db/RecommendationDB.js");

const ResponseAgent = require("../../llm/agents/_responseAgent.js")
const DBAgent = require("../../llm/agents/dbAgent.js")
const SeperateAgent = require("../../llm/agents/seperateAgent.js")
const MODEL2 = "gpt-4o"
class ProductInfoProcessor extends InformationProcessor {
    async process() {
        console.log("✅ Düşük belirsizlik: LLM önerileri için 5 ürün arıyoruz...");

        let product = this.product || {};
        if (product != null) {
            try {
                console.log("product", product)

                let productInformation = `${product.title} `;
                productInformation += product.description
                productInformation += product.attribue.map(item => {
                    let result;
                    result += item.name + " : " + item.value
                    return result;
                })




                console.log("productInformation", productInformation)



            } catch (error) {
                console.error("❌ Vektör oluşturma veya arama sırasında hata oluştu:", error.message);
            }
        }
        //llmContext, questions = {}, recommendations = []
        return this.setInformationText(productInformation);
    }
}

module.exports = ProductInfoProcessor;