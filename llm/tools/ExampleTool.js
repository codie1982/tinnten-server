const { BaseTool } = require("./BaseTool");
// Gerekirse: const agentsRegistry = require("../agents");
// Gerekirse: const DB = require("../../db/SomeDB");

class ExampleTool extends BaseTool {
  constructor() {
    super("ExampleTool");
    this.agent = null; // Opsiyonel, ajan tabanlı araçlar için
  }

  // Niyet uygun mu?
  shouldHandle(intent) {
    return intent.intent === "some_intent" || intent.tool === "ExampleTool";
  }

  // Ana mantık
  async execute({ query, related_id, intent, context }) {
    try {
      this.log("İşlem başlatılıyor:", { query, intent });

      // Örnek mantık (veritabanı veya ajan çağrısı)
      let result;
      if (this.agent) {
        result = await this.agent.someMethod(query, { intent, context, related_id });
      } else {
        // Veritabanı işlemi örneği
        const data = await new DB().read({ _id: related_id }).lean();
        if (!data) throw new Error("Veri bulunamadı");
        result = { someKey: data.value };
      }

      return {
        type: "example_type",
        message: result.someKey || "Başarılı işlem",
        products: [], // Uygunsa doldur
        services: [], // Uygunsa doldur
        action: "respond",
      };
    } catch (error) {
      this.error("İşlem hatası", error);
      return {
        system_message: `Hata: ${error.message}`,
        action: "none",
        products: [],
        services: [],
      };
    }
  }

  // Başlatma (opsiyonel)
  async initialize(config = {}) {
    try {
      this.config = { ...config, defaultKey: config.defaultKey || "value" };
      if (this.agent) {
        this.agent = agentsRegistry.SomeAgent;
        if (!this.agent) throw new Error("SomeAgent not found");
        if (typeof this.agent.start === "function") {
          await this.agent.start(this.config);
        }
      }
      this.log("Initialized with config:", this.config);
    } catch (error) {
      this.error("Initialization error", error);
      throw new Error(`ExampleTool initialization failed: ${error.message}`);
    }
  }
}

module.exports = { ExampleTool };