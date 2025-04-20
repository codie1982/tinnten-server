const ConversationProcessor = require("./ConversationProcessor");
const axios = require("axios");
const ProductDB = require("../../db/ProductsDB");
const ServicesDB = require("../../db/ServicesDB");
const RecommendationDB = require("../../db/RecommendationDB");
const SeperateAgent = require("../../llm/agents/seperateAgent.js")
const DBAgent = require("../../llm/agents/dbAgent.js");
const MODEL2 = "gpt-4o"


/**
 *  this.context = {
              "request_type": "",  // Örn. product
              "uncertainty_level": "", // Örn. low 
              "products": [ 
                            {
                                "product_name": "",     // olası ürün ismini yaz
                                "product_category": [], // olası ürün kategorilerini yaz
                                "search_context": "",   // ürünü arama için geniş ve açıklayıcı bir arama cümlesi yaz
                            }
                          ],
              "services": [
                            {
                                "services_name": "",    // olası hizmet ismini yaz
                                "product_category": [], // olası hizmet kategorilerini yaz
                                "search_context": "",   // hizmeti arama için geniş ve açıklayıcı bir arama cümlesi yaz
                            }
                          ],
              "general_categories": [],
            }`
 */
class LowUncertaintyProcessor extends ConversationProcessor {
    constructor(context, id) {
        super(context, id)
    }
    async process() {
        console.log("✅ Düşük belirsizlik: LLM önerileri için 5 ürün arıyoruz...");
        console.log("this.context", this.context)

        let products = this.context?.products || [];
        let services = this.context?.services || [];


        console.log("products", products)

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

                let dbAgent = new DBAgent();
                await dbAgent.start(MODEL2, 0.2);
                console.log("DBAgent started successfully");

                const productDBContext = await dbAgent.getAggregateForProduct(product.search_context, vectorResponse.data.vector, 5)
                console.log("[DBAgent] response context...", productDBContext);


                const similarProducts = await new ProductDB().searchFromAgent(productDBContext.agg);
                console.log("similarProducts", JSON.stringify(similarProducts, null, 2))

                let seperateResponseContext = null;
                if (similarProducts.length > 0) {

                    let seperateAgent = new SeperateAgent();
                    await seperateAgent.start(MODEL2, 0.2);
                    seperateResponseContext = await seperateAgent.getSeperate(product.search_context, similarProducts)
                    console.log("[SeperateAgent] response context...", JSON.stringify(seperateResponseContext, null, 2));

                    
                    
                    // seperateResponseContext.content.mainProductList,
                    // seperateResponseContext.content.auxiliaryProductList,


                    /*     let LLM = new ResponseAgent();
                        await LLM.start(MODEL2, 0.2);
                        console.log("ResponseAgent started successfully");
                        responseContext = await LLM.getResponseContext(product.search_context,
                            seperateResponseContext.content.mainProductList,
                            seperateResponseContext.content.auxiliaryProductList, null)
                        console.log("[ResponseAgent] response context...", responseContext); */

                } else {
                    console.log(`⚠️ ${product.product_name} için benzer ürün bulunamadı, recommendation eklenmeyecek.`);
                }

                try {
                    // **Benzer ürünleri Recommendation olarak kaydet**


                    this.producsGroup.push({
                        groupname: product.product_name,
                        products: similarProducts.length > 0 ?
                            {
                                main: seperateResponseContext.mainProductList,
                                auxiliary: seperateResponseContext.auxiliaryProductList
                            } : {}, // ✅ DOĞRU ID ALMA
                        explanation: product.search_context,
                    })


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
                    this.servicesGroup.push(
                        {
                            type: "serviceRecommendation",
                            groupname: service.services_name,
                            services: similarServices, // ✅ DOĞRU ID ALMA
                            explanation: service.search_context
                        }
                    )
                } else {
                    console.log(`⚠️ ${service.services_name} için benzer hizmetler bulunamadı, recommendation eklenmeyecek.`);
                }
            } catch (error) {
                console.error("❌ Vektör oluşturma veya arama sırasında hata oluştu:", error.message);
            }
        }

        let recommendation = await new RecommendationDB()
            .update({ _id: this.recomid },
                {
                    type: "recommendation",
                    producsGroup: this.producsGroup,
                    servicesGroup: this.servicesGroup

                }
            );

        //type, updateRecommendation
        return await this.createRecommendation("recommendation", recommendation.id);
    }
}

module.exports = LowUncertaintyProcessor;