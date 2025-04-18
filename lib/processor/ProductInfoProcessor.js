const InformationProcessor = require("./InformationProcessor.js");
const axios = require("axios");
const ProductDB = require("../../db/ProductsDB.js");

const MODEL2 = "gpt-4o"
class ProductInfoProcessor extends InformationProcessor {
    async process() {
        console.log("✅ Düşük belirsizlik: LLM önerileri için 5 ürün arıyoruz...");

        let productid = this.productid || {};
        console.log("productid", productid)
        const productDB = await new ProductDB().read({ _id: productid })
        if (productDB != null) {
            try {
                console.log("productDB", productDB)
                let productInformationText = `${productDB.title} `;
                productInformationText += productDB.description
                productInformationText += productDB.attribue.map(item => {
                    let result;
                    result += item.name + " : " + item.value
                    return result;
                })
            } catch (error) {
                console.error("❌ Ürün bilgilerinde hata oluştur:", error.message);
            }
        }
        //llmContext, questions = {}, recommendations = []
        return this.setInformation(productDB);
    }
}

module.exports = ProductInfoProcessor;