const BaseTool = require("./BaseTool");
const Product = require("../../db/ProductsDB");

class ProductDetailTool extends BaseTool {
  constructor() {
    super("ProductDetailTool");
  }

  shouldHandle(intent) {
    return intent.intent === "production_info" && intent.related_id;
  }

  async execute({ related_id, intent }) {
    try {
      this.log("Ürün sorgulanıyor:", { related_id });
      const prod = await new Product().read({ _id: related_id }).lean();
      if (!prod) throw new Error("Ürün bulunamadı");

      return {
        type: "product_info",
        message: `${prod.title}: ${prod.description} (${prod.basePrice} TL)`,
        products: [{ id: prod._id, title: prod.title, description: prod.description, price: prod.basePrice, features: prod.attributes }],
        services: [],
        action: "respond",
      };
    } catch (error) {
      this.error("Ürün sorgulama hatası", error);
      return { system_message: `Hata: ${error.message}`, action: "none", products: [], services: [] };
    }
  }
}

module.exports = ProductDetailTool;   // ⬅️  SADECE class’ı export et
