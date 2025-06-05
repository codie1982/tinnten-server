/**
 * @module QuestionTool
 * @description Düşük güven niyetleri veya doğrudan belirtilen durumlarda sorular üreten bir araç.
 * ToolOrchestrator ile entegre çalışır ve QuestionAgent'ı kullanır.
 */
const BaseTool = require("./BaseTool");
const agentsRegistry = require("../agents");
/**
 * @class QuestionTool
 * @extends BaseTool
 * @description Kullanıcı niyetine dayalı sorular üreten araç.
 */
class QuestionTool extends BaseTool {
    /**
     * @constructor
     * @description QuestionTool örneği oluşturur ve BaseTool'dan türetir.
     */
    constructor() {
        super("QuestionTool");
        this.agent = null;
    }

    /**
   * @method shouldHandle
   * @description Niyetin bu araç tarafından işlenip işlenmeyeceğini belirler.
   * @param {Object} intent - Niyet objesi
   * @param {string} intent.tool - Belirtilen araç adı
   * @param {number} intent.confidence - Niyet güven skoru
   * @param {Object} [intent.fallback] - Fallback aracı ve sorgusu
   * @returns {boolean} Niyetin işlenip işlenmeyeceği
   */
    shouldHandle(intent) {
        return (
            intent.tool === "QuestionTool" ||
            (intent.confidence < 0.4 && intent.fallback?.tool === "QuestionTool")
        );
    }

    /**
   * @method execute
   * @async
   * @description Soru üretme mantığını çalıştırır.
   * @param {Object} params - Çalıştırma parametreleri
   * @param {string} [params.query] - Kullanıcı sorgusu
   * @param {string|null} [params.related_id] - Ürün/hizmet ID'si
   * @param {Object} params.intent - Niyet objesi
   * @param {Object} params.context - Bağlam (user_id, conversation_history, vb.)
   * @returns {Promise<Object>} Standart yanıt formatı
   * @throws {Error} Soru üretme başarısız olursa
   */
    async execute({ query, related_id, intent, context }) {
        try {
            this.log("Soru üretiliyor:", { query, intent, related_id });

            if (!this.agent) {
                throw new Error("QuestionAgent not initialized");
            }

            // Query veya fallback query kullan, yoksa varsayılan
            const human_message = query || intent.query || "Ne hakkında bilgi almak istiyorsunuz?";

            // QuestionAgent'ın getQuestion metodunu çağır
            const questionResponse = await this.agent.getQuestion(human_message, {
                intent: intent.intent,
                context,
                related_id,
            });

            // Yanıtı kontrol et
            if (!questionResponse?.questionText) {
                throw new Error("Invalid question response from QuestionAgent");
            }

            return {
                type: "question",
                message: questionResponse.questionText,
                products: [],
                services: [],
                action: "question",
            };
        } catch (error) {
            this.error("Soru üretme hatası", error);
            return {
                system_message: `Soru üretilirken hata oluştu: ${error.message}`,
                action: "none",
                products: [],
                services: [],
            };
        }
    }

    /**
 * @method initialize
 * @async
 * @description QuestionAgent'ı başlatır ve yapılandırmayı uygular.
 * @param {Object} [config={}] - Yapılandırma parametreleri
 * @param {string} [config.model="gpt-3.5-turbo"] - LLM modeli
 * @param {number} [config.temperature=0.3] - Yaratıcılık seviyesi
 * @throws {Error} Başlatma başarısız olursa
 */
    async initialize(config = {}) {
        try {
            this.config = {
                model: config.model || "gpt-3.5-turbo",
                temperature: config.temperature || 0.3,
            };

            // agentsRegistry'den QuestionAgent'ı al
            this.agent = agentsRegistry.QuestionAgent;
            if (!this.agent) {
                throw new Error(
                    `QuestionAgent not found in agents registry. Available agents: ${Object.keys(agentsRegistry).join(", ")}`
                );
            }

            // Agent'ın start metodunu çağır (varsa)
            if (typeof this.agent.start === "function") {
                await this.agent.start(this.config.model, this.config.temperature);
            }

            this.log("Initialized with config:", this.config);
        } catch (error) {
            this.error("Initialization error", error);
            throw new Error(`QuestionTool initialization failed: ${error.message}`);
        }
    }
}

module.exports = {QuestionTool};