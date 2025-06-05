const BaseDB = require('./BaseDB');
const Conversation = require("../mongoModels/conversationModel");
const MessageDB = require('../db/MessageDB');

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
            const conversation = await Conversation.find(query).lean();
            if (!conversation) throw new Error("Conversation not found.");

            // 💬 Tüm mesajları MessageDB üzerinden oku (her biri recommendation içeriğiyle birlikte gelir)
         /*    const messageDB = new MessageDB()
            const messages = await Promise.all(
                conversation.messages.map(id =>
                    messageDB.read({ _id: id }) 
                )
            );
            conversation.messages = messages; */
            return conversation;
        } catch (error) {
            throw new Error("MongoDB: Konuşma getirilirken hata oluştu - " + error.message);
        }
    }

    async read(query) {
        try {
            const conversation = await Conversation.findOne(query).lean();
            if (!conversation) throw new Error("Conversation not found.");

            // 💬 Tüm mesajları MessageDB üzerinden oku (her biri recommendation içeriğiyle birlikte gelir)
            //const messageDB = new MessageDB()

           /*  const messages = await Promise.all(
                conversation.messages.map(id =>
                    messageDB.read({ messageid: id })  // burada `read()` fonksiyonu recommendation'ları hydrate eder
                )
            ); */
            //conversation.messages =await messageDB.read({ conversationid: conversation.conversationid });
            //conversation.messages = messages;
            return conversation;
        } catch (error) {
            throw new Error(
                "MongoDB: Konuşma getirilirken hata oluştu - " +
                error.message +
                " | Query: " +
                JSON.stringify(query)
            );
        }
    }



    async readMany(query, page = 1, limit = 10) {
        try {
            let skip = (page - 1) * limit
            const result = await Conversation.find(query)
                .sort({ "createdAt": -1 })
                .limit(limit)
                .skip(skip)


                
            return result; // Eğer sonuç varsa ilkini döndür
        } catch (error) {
            throw new Error(
                "MongoDB: Konuşma getirilirken hata oluştu - " +
                error.message +
                " | Query: " +
                JSON.stringify(query)
            );
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
                .sort({ _id: -1 })
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
            const result = await Conversation.findOneAndUpdate(
                query,
                { $set: { delete: true } },
                { new: true }
            );
            return result ? true : false;
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