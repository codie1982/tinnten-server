const ConversationProcessor = require("./ConversationProcessor.js");
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
class LowUncertaintyProcessor extends ConversationProcessor {
    async process() {
        console.log("✅ Düşük belirsizlik: LLM önerileri için 5 ürün arıyoruz...");

        let recommendationIds = []; // Mesaj içindeki önerileri saklamak için
        let products = this.context.content?.products || [];
        let services = this.context.content?.services || [];

        let searchContext = []
        for (let product of products) {
            try {
                console.log("product", product)
                searchContext.push(product.search_context)
                // **Vektör metni oluştur**
                //${product.product_category} ${product.search_context}
                let vectorText = `${product.product_name} `;

                if (Array.isArray(product.product_category)) {
                    vectorText += product.product_category.join(" ") + " ";
                } else if (typeof product.product_category === "string") {
                    vectorText += product.product_category + " ";
                }

                vectorText += product.search_context;

                console.log("vectorText", vectorText)
                // **Embedding API'ye istek at**
                const vectorResponse = await axios.post(process.env.EMBEDDING_URL + "/api/v10/llm/vector", { text: vectorText });
                // **Vektör ile benzer en fazla 5 ürünü ara**

                let LLMDB = new DBAgent();
                await LLMDB.start(MODEL2, 0.2);
                console.log("DBAgent started successfully");

                const productDBContext = await LLMDB.getProductDBContext(product.search_context, vectorResponse.data.vector, 15)
                console.log("[DBAgent] response context...", productDBContext);


                const similarProducts = await new ProductDB().searchFromAgent(productDBContext.content.agg);
                console.log("similarProducts", JSON.stringify(similarProducts, null, 2))
                let responseContext = null;
                let seperateResponseContext = null;
                if (similarProducts.length > 0) {

                    let LLMSEPARETE = new SeperateAgent();
                    await LLMSEPARETE.start(MODEL2, 0.2);
                    seperateResponseContext = await LLMSEPARETE.getSeperateContext(product.search_context, similarProducts)
                    console.log("[SeperateAgent] response context...", JSON.stringify(seperateResponseContext, null, 2));

                    let LLM = new ResponseAgent();
                    await LLM.start(MODEL2, 0.2);
                    console.log("ResponseAgent started successfully");
                    responseContext = await LLM.getResponseContext(product.search_context,
                        seperateResponseContext.content.mainProductList,
                        seperateResponseContext.content.auxiliaryProductList, null)
                    console.log("[ResponseAgent] response context...", responseContext);
                } else {
                    console.log(`⚠️ ${product.product_name} için benzer ürün bulunamadı, recommendation eklenmeyecek.`);
                }

                try {
                    // **Benzer ürünleri Recommendation olarak kaydet**
                    let recommendation = new Recommendation({
                        type: "productRecommendation",
                        groupname: product.product_name,
                        products: similarProducts.length > 0 ?
                            {
                                main: seperateResponseContext.content.mainProductList,
                                auxiliary: seperateResponseContext.content.auxiliaryProductList
                            } : {}, // ✅ DOĞRU ID ALMA
                        explanation: product.search_context,
                        system_message: responseContext?.content
                    });
                    console.log("recommendation", recommendation)
                    let savedRecommendation = await new RecommendationDB().create(recommendation);
                    console.log("savedRecommendation", savedRecommendation)
                    recommendationIds.push(savedRecommendation._id);
                } catch (error) {
                    console.error("❌ Öneri kaydedilirken hata oluştu:", error.message);
                }
            } catch (error) {
                console.error("❌ Vektör oluşturma veya arama sırasında hata oluştu:", error.message);
            }
        }







        // **Hizmetleri RecommendationDB'ye Kaydet**
        for (let service of services) {
            try {
                searchContext.push(service.search_context)
                // **Vektör metni oluştur**
                let vectorText = `${service.services_name} `;

                if (Array.isArray(service.product_category)) {
                    vectorText += service.product_category.join(" ") + " ";
                } else if (typeof service.product_category === "string") {
                    vectorText += service.product_category + " ";
                }

                vectorText += service.search_context;

                console.log("Services VectorText", vectorText)
                // **Embedding API'ye istek at**
                const vectorResponse = await axios.post(process.env.EMBEDDING_URL + "/api/v10/llm/vector", { text: vectorText });
                // **Vektör ile benzer en fazla 5 ürünü ara**
                const similarServices = await new ServicesDB().search(vectorResponse.data.vector, 5);

                if (similarServices.length > 0) {
                    // **Benzer Servisleri Recommendation olarak kaydet**
                    let recommendation = new Recommendation({
                        type: "serviceRecommendation",
                        groupname: service.services_name,
                        services: similarServices, // ✅ DOĞRU ID ALMA
                        explanation: service.search_context
                    });
                    let savedRecommendation = await new RecommendationDB().create(recommendation);
                    recommendationIds.push(savedRecommendation._id);

                } else {
                    console.log(`⚠️ ${service.services_name} için benzer hizmetler bulunamadı, recommendation eklenmeyecek.`);
                }
            } catch (error) {
                console.error("❌ Vektör oluşturma veya arama sırasında hata oluştu:", error.message);
            }
        }

        //llmContext, questions = {}, recommendations = []
        return this.createSystemMessage({}, recommendationIds);
    }
}

module.exports = LowUncertaintyProcessor;