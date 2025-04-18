const Cost = require("../../lib/cost")
const { seperateContext } = require("../system_promt/seperateContext")
const BaseAgent = require("./BaseAgent")

class SeperateAgent extends BaseAgent {
     async getSeperate(search_context, similarProducts) {
        try {
          console.log("[SeperateAgent] Fetching intent system prompt...");
          const system_message = await seperateContext(similarProducts, search_context);
          //console.log("[SeperateAgent] Intent context received:", system_message);
    
    
          console.log("[SeperateAgent] Sending MCP chat completion request...");
          // MCP mesajı oluştur
          const response = await this.sendAgentCompletion(this.createMCPMessage(
            null, // context_id gerekmiyorsa null, yoksa dinamik atanabilir
            [
              {
                role: "system",
                content: system_message || "Sen bir akıllı asistansın",
                timestamp: new Date().toISOString(),
              },
              {
                role: "user",
                content: search_context,
                timestamp: new Date().toISOString(),
              },
            ],
            false // Stream kullanılmıyor
          ));
    
          console.log("[SeperateAgent] Completion response received:", response);
    
          // MCP yanıtından içeriği al
          const rawResponse = response.messages[0].content;
    
          // JSON’u parse et
          const parsedResponse = this.cleanJSON(rawResponse);
          console.log("[SeperateAgent] Parsed response:", parsedResponse);
    
            // Filter similarProducts based on matching title with products in seperateResponseContext
        let mainProductList = [];
        parsedResponse.mainproductList.forEach(item => {
            similarProducts.forEach(simProd => {
                if (item.title === simProd.title) {
                    mainProductList.push(simProd);
                }
            });
        });

        let auxiliaryProductList = [];
        parsedResponse.auxiliarymainList.forEach(item => {
            similarProducts.forEach(simProd => {
                if (item.title === simProd.title) {
                    auxiliaryProductList.push(simProd);
                }
            });
        });

          return { mainProductList, auxiliaryProductList };
        } catch (error) {
          console.error("[RecomAgent] Recom analiz hatası:", error);
          return "chat"; // Varsayılan intent, hata durumunda
        }
      }
}

module.exports = SeperateAgent