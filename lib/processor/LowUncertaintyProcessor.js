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
                const vectorText = `${product.product_name} ${product.product_category} ${product.search_context}`;
                // **Embedding API'ye istek at**
                const vectorResponse = await axios.post(process.env.EMBEDDING_URL + "/api/v10/llm/vector", { text: vectorText });
                // **Vektör ile benzer en fazla 5 ürünü ara**
                const similarProducts = await new ProductDB().search(vectorResponse.data.vector, 5);

                if (similarProducts.length > 0) {
                    // **Benzer ürünleri Recommendation olarak kaydet**
                    let recommendation = new Recommendation({
                        type: "productRecommendation",
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
                searchContext.push(product.search_context)
                // **Vektör metni oluştur**
                const vectorText = `${product.product_name} ${product.product_category} ${product.search_context}`;
                // **Embedding API'ye istek at**
                const vectorResponse = await axios.post(process.env.EMBEDDING_URL + "/api/v10/llm/vector", { text: vectorText });
                // **Vektör ile benzer en fazla 5 ürünü ara**
                const similarServices = await new ServicesDB().search(vectorResponse.data.vector, 5);


                if (similarServices.length > 0) {
                    // **Benzer Servisleri Recommendation olarak kaydet**
                    let recommendation = new Recommendation({
                        type: "serviceRecommendation",
                        services: similarServices, // ✅ DOĞRU ID ALMA
                        explanation: service.search_context
                    });
                    let savedRecommendation = await new RecommendationDB().create(recommendation);
                    recommendationIds.push(savedRecommendation._id);

                } else {
                    console.log(`⚠️ ${product.product_name} için benzer ürün bulunamadı, recommendation eklenmeyecek.`);
                }
            } catch (error) {
                console.error("❌ Vektör oluşturma veya arama sırasında hata oluştu:", error.message);
            }
        }

        return this.createSystemMessage(
            this.context.content.system_message,
            this.context.context,
            this.context.content?.search_context || "",
            {}, // **Low Uncertainty'de questions yok**
            this.context.finish_reason,
            recommendationIds, // **Önerileri ekledik**
            [] // **Action parametresi **
        );
    }
}

module.exports = LowUncertaintyProcessor;