const mongoose = require("mongoose");
const Conversation = require("../../models/conversationModel");
const MemoryAgent = require("../agents/memoryAgent");


class MemoryManager {
    constructor(userId) {
        this.userId = userId;
        this.conversation
        this.memory = {
            messages: [],
            products: [],
            services: [],
            companies: [],
            recommendations: []
        };
    }

    async loadMemory(conversationid) {
        try {
            this.conversation = await Conversation.findOne({ conversationid })
                .populate({
                    path: "messages",
                    options: { sort: { createdAt: -1 }, limit: 10 }, // Son 10 mesajı getir
                    populate: [
                        {
                            path: "systemData.recommendations",
                            model: "recommendation",
                            populate: [
                                { path: "productid", model: "product" },
                                { path: "serviceid", model: "service" },
                                { path: "companyid", model: "company" }
                            ]
                        },
                        { path: "productionQuestions", model: "question" },
                        { path: "servicesQuestions", model: "question" }
                    ]
                });

            if (!this.conversation) {
                console.warn(`Konuşma bulunamadı: ${conversationid}`);
                return;
            }

            // Mesajlardan tüm önerileri topla
            const recommendations = this.conversation.messages.flatMap(m => m.systemData?.recommendations || []);

            // Benzersiz product, service ve company ID'lerini al
            const productIds = [...new Set(recommendations.map(r => r.productid).filter(id => id))];
            const serviceIds = [...new Set(recommendations.map(r => r.serviceid).filter(id => id))];
            const companyIds = [...new Set(recommendations.map(r => r.companyid).filter(id => id))];

            // Hafızayı yükle
            this.memory = {
                products: await Product.find({ _id: { $in: productIds } }),
                services: await Service.find({ _id: { $in: serviceIds } }),
                companies: await Company.find({ _id: { $in: companyIds } })
            };

        } catch (error) {
            console.error("Hafıza yüklenirken hata oluştu:", error);
        }
    }
    async getSummrize() {
        let memAgent = new MemoryAgent()
        memAgent.getMemory(this.memory)
        return memAgent;
    }

}

module.exports = MemoryManager;
