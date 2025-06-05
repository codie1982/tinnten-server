const BaseTool = require("../tools/BaseTool");
const ProductsDB = require("../../db/ProductsDB");

class ProductSearchTool extends BaseTool {
  constructor() {
    super("ProductSearchTool");
    this.vectorLimit = 5;
    this.vectorThreshold = 0.75;
  }

  // Bu araç hangi intent'ler için çalışmalı?
  shouldHandle(intent) {
    return intent.intent === "product_search" || intent.tool === "ProductSearchTool";
  }

  /**
   * @desc Ürün arama işlemini yapar
   * @param {Object} query - Kullanıcı açıklaması (natural language)
   * @param {Object} context - LLM'den gelen context verileri
   * @param {Object} intent - Tespit edilen intent
   */
  async execute({ query, context, intent }) {
    try {
      this.log("Ürün arama başlatıldı:", { query });

      // [1] Açıklama embed edilerek vektöre çevrilir
      const vectorText = query.trim().slice(0, 1000);
      const embedURL = `${process.env.EMBEDDING_URL}/api/v10/llm/vector`;
      const vectorResponse = await this.fetchVector(embedURL, vectorText);
      const vector = vectorResponse.data.vector;

      if (!Array.isArray(vector)) throw new Error("Geçerli vektör alınamadı");

      // [2] MongoDB vektörel arama
      const db = new ProductsDB();
      const vectorResults = await db.searchVector(vector, this.vectorLimit);

      const matched = vectorResults.filter(item => item.score >= this.vectorThreshold);
      const count = matched.length;

      return {
        type: "product_list",
        message: `${count} uygun ürün bulundu.`,
        products: matched.map(item => ({
          _id: item._id,
          title: item.title,
          score: item.score
        })),
        action: count > 0 ? "respond" : "followup",
      };

    } catch (err) {
      this.error("Ürün arama hatası", err);
      return {
        system_message: `Arama hatası: ${err.message}`,
        action: "none",
        products: [],
      };
    }
  }
    // Opsiyonel başlatma fonksiyonu
    async initialize(config = {}) {
      try {
        // Tool’a özel konfigürasyon
        this.vectorLimit = config.vectorLimit || this.vectorLimit;
        this.vectorThreshold = config.vectorThreshold || this.vectorThreshold;
        this.config = config;
  
        this.log("ProductSearchTool başlatıldı", {
          vectorLimit: this.vectorLimit,
          vectorThreshold: this.vectorThreshold,
        });
      } catch (err) {
        this.error("ProductSearchTool başlatılamadı", err);
        throw new Error(`ProductSearchTool initialization failed: ${err.message}`);
      }
    }

  // Embed servisinden vektör alan yardımcı fonksiyon
  async fetchVector(url, text) {
    const axios = require("axios");
    return await axios.post(url, { text });
  }
}

module.exports = { ProductSearchTool };