const ConversationProcessor = require("./ConversationProcessor")
class LowUncertaintyProcessor extends ConversationProcessor {
    async process() {
        console.log("Low uncertainty işlem başlatılıyor...");

        let products = this.context.content.products || [];
        let generalCategories = this.context.content.general_categories || [];
        let action = this.context.content.action || "";
        let tokens = this.context.tokens || {};
        let cost = this.context.cost || {};

        return this.createSystemMessage(
            this.context.system_message,
            this.context.context,
            this.context.search_context
        );
    }
}

// **Sınıfları Dışa Aktar**
module.exports = LowUncertaintyProcessor