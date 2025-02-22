const SummarizeAgent = require("../agents/memoryAgent");

class MemoryManager {

    constructor(userId) {
        this.userId = userId;
        this.conversation = null;
    }

    loadMemory(tempConversation) {
        this.conversation = tempConversation
    }

    async getSummarizedForMemory() {
        if (!this.conversation) return null;
        let sumAgent = new SummarizeAgent();
        const MODEL1 = "gpt-3.5-turbo"
        const MODEL2 = "gpt-4o"
        await sumAgent.start(MODEL2, 0.2);
        return await sumAgent.getSummarize(this.conversation);
    }
}

// **Sınıfı Dışa Aktar**
module.exports = MemoryManager;
