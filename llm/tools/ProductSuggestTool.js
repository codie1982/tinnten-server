/**
 * @module ProductSuggestTool
 * @description Ürün ve hizmet önerileri üreten bir araç. RecomAgent ile bağlam oluşturur,
 * düşük belirsizlikte vektör tabanlı öneriler, yüksek belirsizlikte QuestionAgent ile sorular üretir.
 */
const BaseTool = require("./BaseTool");
const agentsRegistry = require("../agents");
const ProductDB = require("../../db/ProductsDB");
const RecommendationDB = require("../../db/RecommendationDB");
const QuestionDB = require("../../db/QuestionDB");
const axios = require("axios");

/**
 * @class ProductSuggestTool
 * @extends BaseTool
 * @description Ürün önerileri veya yönlendirme soruları üreten araç.
 */
class ProductSuggestTool extends BaseTool {
  /**
   * @constructor
   * @description ProductSuggestTool örneği oluşturur.
   */
  constructor() {
    super("ProductSuggestTool");
    this.questionAgent = null;
    this.recomAgent = null;
  }

  /**
   * @method shouldHandle
   * @description Niyetin bu araç tarafından işlenip işlenmeyeceğini belirler.
   * @param {Object} intent - Niyet objesi
   * @returns {boolean} Niyetin işlenip işlenmeyeceği
   */
  shouldHandle(intent) {
    return (
      intent.intent === "recommendation" ||
      intent.tool === "ProductSuggestTool" ||
      (intent.confidence < 0.4 && intent.fallback?.tool === "ProductSuggestTool")
    );
  }

  /**
   * @method execute
   * @async
   * @description Öneri veya soru üretme mantığını çalıştırır. RecomAgent'ı çağırır.
   * @param {Object} params - Çalıştırma parametreleri
   * @param {string} [params.query] - Kullanıcı sorgusu
   * @param {string|null} [params.related_id] - Ürün/hizmet ID'si
   * @param {Object} params.intent - Niyet objesi
   * @param {Object} params.context - Bağlam (user_id, conversation_history, vb.)
   * @returns {Promise<Object>} Standart yanıt formatı
   * @throws {Error} İşlem başarısız olursa
   */
  async execute({ query, related_id, intent, context }) {
    try {
      this.log("Öneri işlemi başlatılıyor:", { query, intent });

      // RecomAgent ile bağlam üret
      if (!this.recomAgent) {
        throw new Error("RecomAgent not initialized");
      }
      const recomContext = await this.recomAgent.getRecommendation(query, {
        intent,
        context,
        related_id,
      });

      const uncertaintyLevel = recomContext.uncertainty_level || "low";
      if (uncertaintyLevel === "high") {
        return await this.handleHighUncertainty(query, intent, context);
      } else {
        return await this.handleLowUncertainty(recomContext, query, intent, context);
      }
    } catch (error) {
      this.error("Öneri işlemi hatası", error);
      return {
        system_message: `Öneri üretilirken hata oluştu: ${error.message}`,
        action: "none",
        products: [],
      };
    }
  }

  /**
   * @method handleHighUncertainty
   * @async
   * @private
   * @description Yüksek belirsizlik durumunda QuestionAgent ile soru üretir.
   * @param {string} query - Kullanıcı sorgusu
   * @param {Object} intent - Niyet objesi
   * @param {Object} context - Bağlam
   * @returns {Promise<Object>} Soru yanıtı
   */
  async handleHighUncertainty(query, intent, context) {
    this.log("Yüksek belirsizlik: Soru üretiliyor...");

    if (!this.questionAgent) {
      throw new Error("QuestionAgent not initialized");
    }

    const human_message = query || intent.query || "Ne hakkında bilgi almak istersiniz?";
    const questions = await this.questionAgent.getQuestion(human_message, { intent, context });

    // Soruları kaydet
    const questionIds = [];
    for (const question of Array.isArray(questions) ? questions : [questions]) {
      const savedQuestion = await new QuestionDB().create(question);
      questionIds.push(savedQuestion._id);
    }

    // Recommendation kaydı oluştur
    const recommendation = await new RecommendationDB().create({
      type: "question",
      questions: questionIds,
    });

    return {
      type: "question",
      message: questions[0]?.questionText || "Ne hakkında bilgi almak istersiniz?",
      action: "question",
      products: [],
      system_message: "",
    };
  }

  /**
   * @method handleLowUncertainty
   * @async
   * @private
   * @description Düşük belirsizlik durumunda vektör tabanlı ürün önerileri üretir.
   * @param {Object} recomContext - RecomAgent çıktısı
   * @param {string} query - Kullanıcı sorgusu
   * @param {Object} intent - Niyet objesi
   * @param {Object} context - Bağlam
   * @returns {Promise<Object>} Öneri yanıtı
   */
  async handleLowUncertainty(recomContext, query, intent, context) {
    this.log("Düşük belirsizlik: Ürün önerileri üretiliyor...");

    const products = recomContext.products || [];
    const productResults = [];
    const recommendationGroups = [];

    for (const product of products) {
      try {
        // Vektör metni oluştur
        let vectorText = `${product.product_name} `;
        if (Array.isArray(product.product_category)) {
          vectorText += product.product_category.join(" ") + " ";
        } else if (typeof product.product_category === "string") {
          vectorText += product.product_category + " ";
        }
        vectorText += product.search_context;

        // Embedding API'ye istek
        const vectorResponse = await axios.post(process.env.EMBEDDING_URL + "/api/v10/llm/vector", {
          text: vectorText,
        });

        // Benzer ürünleri ara
        const dbAgent = new DBAgent();
        await dbAgent.start(this.config.model, this.config.temperature);
        const productDBContext = await dbAgent.getAggregateForProduct(
          product.search_context,
          vectorResponse.data.vector,
          5
        );

        const similarProducts = await new ProductDB().searchFromAgent(productDBContext.agg);
        if (similarProducts.length === 0) {
          this.log(`No similar products found for ${product.product_name}`);
          continue;
        }

        // Ürünleri ayrıştır
        const seperateAgent = new SeperateAgent();
        await seperateAgent.start(this.config.model, this.config.temperature);
        const seperateResponse = await seperateAgent.getSeperate(
          product.search_context,
          similarProducts
        );

        // Öneri kaydı oluştur
        const recommendation = await new RecommendationDB().create({
          type: "recommendation",
          products: similarProducts.map((p) => p._id),
        });

        recommendationGroups.push({
          groupname: product.product_name,
          products: {
            main: seperateResponse.mainProductList,
            auxiliary: seperateResponse.auxiliaryProductList,
          },
          explanation: product.search_context,
          recommendationId: recommendation._id,
        });

        productResults.push(
          ...similarProducts.map((p) => ({
            id: p._id,
            title: p.title,
            description: p.description,
            price: p.basePrice,
            features: p.attributes,
          }))
        );
      } catch (error) {
        this.error(`Error processing product ${product.product_name}`, error);
      }
    }

    if (productResults.length === 0) {
      return {
        type: "recommendation",
        message: "Uygun ürün önerisi bulunamadı.",
        action: "respond",
        products: [],
        services: [],
        system_message: "",
      };
    }

    return {
      type: "recommendation",
      message: `${productResults.length} ürün önerildi.`,
      action: "respond",
      products: productResults,
      services: [],
      system_message: "",
    };
  }

  /**
   * @method initialize
   * @async
   * @description QuestionAgent, RecomAgent ve diğer bağımlılıkları başlatır.
   * @param {Object} [config={}] - Yapılandırma
   * @returns {Promise<void>}
   * @throws {Error} Başlatma başarısız olursa
   */
  async initialize(config = {}) {
    try {
      this.config = {
        model: config.model || "gpt-3.5-turbo",
        temperature: config.temperature || 0.2,
      };

      // QuestionAgent'ı al
      this.questionAgent = agentsRegistry.QuestionAgent;
      if (!this.questionAgent) {
        throw new Error("QuestionAgent not found in agents registry");
      }
      if (typeof this.questionAgent.start === "function") {
        await this.questionAgent.start(this.config.model, this.config.temperature);
      }

      // RecomAgent'ı al
      this.recomAgent = agentsRegistry.RecomAgent;
      if (!this.recomAgent) {
        throw new Error("RecomAgent not found in agents registry");
      }
      if (typeof this.recomAgent.start === "function") {
        await this.recomAgent.start(this.config.model, this.config.temperature);
      }

      this.log("Initialized with config:", this.config);
    } catch (error) {
      this.error("Initialization error", error);
      throw new Error(`ProductSuggestTool initialization failed: ${error.message}`);
    }
  }
}

module.exports = ProductSuggestTool