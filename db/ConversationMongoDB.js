const BaseDB = require('./BaseDB');
const Conversation = require("../mongoModels/conversationModel");
const Message = require('../mongoModels/messageModel');
const Recommendation = require('../mongoModels/recommendationModel');
const Product = require('../mongoModels/productsModel');
const Question = require('../mongoModels/questionModel');
const Price = require('../mongoModels/priceModel');
const Gallery = require('../mongoModels/galleryModel');
const Image = require('../mongoModels/imagesModel');
const Service = require('../mongoModels/servicesModel');
const CompanyProfile = require('../mongoModels/companyProfilModel');

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
            // 1. Ana Conversation dokümanını bul
            const conversation = await Conversation.findOne(query).lean();

            if (!conversation) {
                throw new Error("Conversation not found.");
            }

            // 2. Messages'ı ayrı çek
            const messages = await Message.find({ _id: { $in: conversation.messages } }).lean();

            // 3. Her mesajın içindeki populate edilecek alanları doldur
            for (let msg of messages) {
                // productionQuestions
                if (msg.productionQuestions?.length > 0) {
                    msg.productionQuestions = await Question.find({
                        _id: { $in: msg.productionQuestions }
                    }).lean();
                }

                // servicesQuestions
                if (msg.servicesQuestions?.length > 0) {
                    msg.servicesQuestions = await Question.find({
                        _id: { $in: msg.servicesQuestions }
                    }).lean();
                }

                // recommendations
                if (msg.recommendations?.length > 0) {
                    const recs = await Recommendation.find({
                        _id: { $in: msg.recommendations }
                    }).lean();

                    for (let rec of recs) {
                        // products
                        if (rec.products?.main?.length > 0 || rec.products?.auxiliary?.length > 0) {
                            const allProductIds = [
                                ...(rec.products.main || []),
                                ...(rec.products.auxiliary || [])
                            ];

                            const allProducts = await Product.find(
                                { _id: { $in: allProductIds } },
                                { vector: 0, description: 0, meta: 0 }
                            ).lean();

                            const productMap = new Map();
                            for (let product of allProducts) {
                                if (product.basePrice) {
                                    product.basePrice = await Price.findById(product.basePrice).lean();
                                }

                                if (product.gallery) {
                                    const gallery = await Gallery.findById(product.gallery, { description: 0 }).lean();
                                    if (gallery?.images?.length > 0) {
                                        gallery.images = await Image.find({
                                            _id: { $in: gallery.images }
                                        }).lean();
                                    }
                                    product.gallery = gallery;
                                }

                                productMap.set(product._id.toString(), product);
                            }

                            rec.products.main = (rec.products.main || []).map(id => productMap.get(id.toString())).filter(Boolean);
                            rec.products.auxiliary = (rec.products.auxiliary || []).map(id => productMap.get(id.toString())).filter(Boolean);
                        }

                        // services
                        if (rec.services?.main?.length > 0 || rec.services?.auxiliary?.length > 0) {
                            const allServiceIds = [
                                ...(rec.services.main || []),
                                ...(rec.services.auxiliary || [])
                            ];

                            const allServices = await Service.find({
                                _id: { $in: allServiceIds }
                            }).lean();

                            const serviceMap = new Map();
                            for (let service of allServices) {
                                serviceMap.set(service._id.toString(), service);
                            }

                            rec.services.main = (rec.services.main || []).map(id => serviceMap.get(id.toString())).filter(Boolean);
                            rec.services.auxiliary = (rec.services.auxiliary || []).map(id => serviceMap.get(id.toString())).filter(Boolean);
                        }

                        // companies
                        if (rec.companyies?.length > 0) {
                            rec.companyies = await CompanyProfile.find({
                                _id: { $in: rec.companyies }
                            }).lean();
                        }
                    }

                    msg.recommendations = recs;
                }
            }

            // 4. Final sonucu conversation ile birleştir
            conversation.messages = messages;
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


    async readMany(query) {
        try {
            const result = await Conversation.find(query)
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