const mongoose = require("mongoose");
const Message = require("../mongoModels/messageModel"); // Mesaj modelini içe aktar
const BaseDB = require("./BaseDB");

class MessageDB extends BaseDB {
    async create(data) {
        try {
            const message = new Message(data);
            return await message.save();
        } catch (error) {
            throw new Error("MongoDB: Mesaj oluşturulurken hata oluştu - " + error.message);
        }
    }

    async read(query) {
        try {
            return await Message.findOne(query)
                .populate("productionQuestions")
                .populate("servicesQuestions")
                .populate({
                    path: "systemData.recommendations",
                    populate: [
                        { path: "products" },
                        { path: "services" },
                        { path: "companies" }
                    ]
                });
        } catch (error) {
            throw new Error("MongoDB: Mesaj getirilirken hata oluştu - " + error.message);
        }
    }

    async update(query, updateData) {
        try {
            return await Message.findOneAndUpdate(
                query,
                { $set: updateData },
                { new: true }
            );
        } catch (error) {
            throw new Error("MongoDB: Mesaj güncellenirken hata oluştu - " + error.message);
        }
    }

    async delete(query) {
        try {
            return await Message.findOneAndUpdate(
                query,
                { $set: { includeInContext: false } }, // Silmek yerine bağlam dışına çıkarıyoruz
                { new: true }
            );
        } catch (error) {
            throw new Error("MongoDB: Mesaj silinirken hata oluştu - " + error.message);
        }
    }

    async recover(query) {
        try {
            return await Message.findOneAndUpdate(
                query,
                { $set: { includeInContext: true } }, // Silinmiş mesajı geri ekliyoruz
                { new: true }
            );
        } catch (error) {
            throw new Error("MongoDB: Mesaj geri getirilirken hata oluştu - " + error.message);
        }
    }

    async search(userid, text, page, limit) {
        try {
            const findMessage = await Message.aggregate([
                {
                    $search: {
                        index: "default",
                        text: {
                            query: text,
                            path: {
                                wildcard: "*"
                            }
                        }
                    }
                },
               /*  {
                    $match: {userid: userid}
                }, */
                {
                    $skip: (page - 1) * limit
                },
                {
                    $limit: limit
                }
            ]);
            return findMessage;
        } catch (error) {
            throw new Error("MongoDB: Mesaj arama yapılırken hata oluştu - " + error.message);
        }
    }
}

module.exports = MessageDB;