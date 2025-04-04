const ConversationProcessor = require("./ConversationProcessor");
const axios = require("axios");

const Product = require("../../models/Product");
const Service = require("../../models/Services");
const ProductDB = require("../../db/ProductsDB");
const ServicesDB = require("../../db/ServicesDB");
const Recommendation = require("../../models/Recommendation");
const RecommendationDB = require("../../db/RecommendationDB");

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
                const similarProducts = await new ProductDB().search(vectorResponse.data.vector, 5);
                console.log("similarProducts", similarProducts)
                if (similarProducts.length > 0) {
                    // **Benzer ürünleri Recommendation olarak kaydet**
                    let recommendation = new Recommendation({
                        type: "productRecommendation",
                        groupname: product.product_name,
                        products: similarProducts, // ✅ DOĞRU ID ALMA
                        explanation: product.search_context
                    });
                    console.log("recommendation", recommendation)
                    let savedRecommendation = await new RecommendationDB().create(recommendation);
                    console.log("savedRecommendation", savedRecommendation)
                    recommendationIds.push(savedRecommendation._id);

                } else {
                    console.log(`⚠️ ${product.product_name} için benzer ürün bulunamadı, recommendation eklenmeyecek.`);
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
        return this.createSystemMessage(this.context, {}, recommendationIds);
    }
}

module.exports = LowUncertaintyProcessor;