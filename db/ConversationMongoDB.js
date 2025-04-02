const BaseDB = require('./BaseDB');
const Conversation = require("../mongoModels/conversationModel");
const { populate } = require('../mongoModels/messageModel');
class ConversationMongoDB extends BaseDB {


    async create(data) {
        try {
            const conversation = new Conversation(data);
            return await conversation.save();
        } catch (error) {
            throw new Error("MongoDB: Konuşma oluşturulurken hata oluştu - " + error.message);
        }
    }
    async findOne(query) {
        try {
            const result = await Conversation.findOne(query)
            return result; // Eğer sonuç varsa ilkini döndür
        } catch (error) {
            throw new Error("MongoDB: Konuşma getirilirken hata oluştu - " + error.message);
        }
    }
    async find(query) {
        try {
            const result = await Conversation.find(query)
            return result; // Eğer sonuç varsa ilkini döndür
        } catch (error) {
            throw new Error("MongoDB: Konuşma getirilirken hata oluştu - " + error.message);
        }
    }
    async read(query) {
        try {
            const result = await Conversation.findOne(query)
                .populate([
                    {
                        path: "messages", module: "message",
                        populate: [
                            {
                                path: "productionQuestions", // Önce `productionQuestions` içindeki ID'leri doldur
                                model: "question"
                            },
                            {
                                path: "servicesQuestions", //
                                model: "question"
                            },
                            {
                                path: "recommendations", // 
                                model: "recommendation",
                                populate: [
                                    {
                                        path: "products", // 
                                        model: "products",
                                        populate: [
                                            {
                                                path: "basePrice", // 
                                                model: "price",
                                            },
                                            {
                                                path: "gallery", // 
                                                model: "gallery",
                                                populate: {
                                                    path: "images", // 
                                                    model: "images",
                                                }
                                            }

                                        ]
                                    },
                                    {
                                        path: "services", // 
                                        model: "services"
                                    },
                                    {
                                        path: "companyies", // 
                                        model: "companyprofile"
                                    },
                                ]
                            },
                        ]
                    },
                ])
            return result; // Eğer sonuç varsa ilkini döndür
        } catch (error) {
            throw new Error("MongoDB: Konuşma getirilirken hata oluştu - " + error.message);
        }
    }
    async readMany(query) {
        try {
            const result = await Conversation.find(query)
            return result; // Eğer sonuç varsa ilkini döndür
        } catch (error) {
            throw new Error("MongoDB: Konuşma getirilirken hata oluştu - " + error.message);
        }
    }
    async readPaginated(query, page, limit) {
        try {
            const skip = (page - 1) * limit;
            const results = await Conversation.find(query)
                .limit(limit)
                .skip(skip);
            return results;
        } catch (error) {
            throw new Error("MongoDB: Konuşmalar alınırken hata oluştu - " + error.message);
        }
    }
    async getHistoryList(query, page, limit) {
        try {
            const skip = (page - 1) * limit;
            const results = await Conversation.find(query, "title conversationid")
                .limit(limit)
                .skip(skip);
            return results;
        } catch (error) {
            throw new Error("MongoDB: Konuşmalar alınırken hata oluştu - " + error.message);
        }
    }
    async gettotalCount(query) {
        try {
            const results = await Conversation.find(query).countDocuments();
            return results;
        } catch (error) {
            throw new Error("MongoDB: Konuşmalar alınırken hata oluştu - " + error.message);
        }
    }
    async update(query, updateData) {
        try {
            let updateQuery = {};

            // updateData içindeki her alanı kontrol et
            for (const key in updateData) {
                if (Array.isArray(updateData[key])) {
                    // Eğer alan bir array ise `$push` kullan
                    updateQuery["$push"] = updateQuery["$push"] || {};
                    updateQuery["$push"][key] = { $each: updateData[key] };
                } else {
                    // Eğer alan array değilse `$set` kullan
                    updateQuery["$set"] = updateQuery["$set"] || {};
                    updateQuery["$set"][key] = updateData[key];
                }
            }

            return await Conversation.findOneAndUpdate(
                query,
                updateQuery,
                { new: true }
            );
        } catch (error) {
            throw new Error("MongoDB: Konuşma güncellenirken hata oluştu - " + error.message);
        }
    }

    async delete(query) {
        try {
            return await Conversation.findOneAndUpdate(
                query,
                { $set: { delete: true } },
                { new: true }
            );
        } catch (error) {
            throw new Error("MongoDB: Konuşma silinirken hata oluştu - " + error.message);
        }
    }

    async recover(conversationId) {
        try {
            return await Conversation.findOneAndUpdate(
                { conversationid: conversationId },
                { $set: { delete: false } },
                { new: true }
            );
        } catch (error) {
            throw new Error("MongoDB: Konuşma geri getirilirken hata oluştu - " + error.message);
        }
    }


    async search(userid, text) {
        try {
            const findConversation = await Conversation.aggregate([
                {
                    "$search": {
                        "text": {
                            "query": "" + text + "",
                            "path": "message_content.content",
                        }
                    }
                }
            ])
            return findConversation;
        } catch (error) {
            throw new Error("MongoDB: Mesaj arama yapılırken hata oluştu - " + error.message);
        }
    }
}

module.exports = ConversationMongoDB;