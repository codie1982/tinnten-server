const mongoose = require("mongoose");
const Service = require("../mongoModels/servicesModel"); // Hizmet modelini içe aktar
const BaseDB = require("./BaseDB");

class ServicesDB extends BaseDB {
    async create(data) {
        try {
            const service = new Service(data);
            return await service.save();
        } catch (error) {
            throw new Error("MongoDB: Hizmet oluşturulurken hata oluştu - " + error.message);
        }
    }

    async read(query) {
        try {
            return await Service.findOne(query)
                .populate("companyid")
                .populate("price")
                .populate("gallery");
        } catch (error) {
            throw new Error("MongoDB: Hizmet getirilirken hata oluştu - " + error.message);
        }
    }

    async update(query, updateData) {
        try {
            return await Service.findOneAndUpdate(
                query,
                { $set: updateData },
                { new: true }
            );
        } catch (error) {
            throw new Error("MongoDB: Hizmet güncellenirken hata oluştu - " + error.message);
        }
    }

    async delete(query) {
        try {
            return await Service.deleteOne(query); // Kalıcı silme işlemi
        } catch (error) {
            throw new Error("MongoDB: Hizmet silinirken hata oluştu - " + error.message);
        }
    }

    async recover(query) {
        throw new Error("MongoDB: Silinen hizmetleri geri getirme desteklenmiyor!");
    }
    async search(vector, limit) {
        try {
            const agg = [
                {
                    $vectorSearch: {
                        index: 'tinnten_product_vector_index',
                        path: 'vector',
                        queryVector: vector,
                        numCandidates: 1000,
                        limit: limit,
                        metric: 'cosine'
                    }
                },
                {
                    $project: {
                        _id: 1,
                        score: { $meta: "vectorSearchScore" } // ✨ Skoru buradan alıyorsun
                    }
                }
            ];

            const result = await Service.aggregate(agg);
            //return await Product.aggregate(agg);
            return result;
        } catch (error) {
            throw new Error("MongoDB: Ürün güncellenirken hata oluştu - " + error.message);
        }
    }


}

module.exports = ServicesDB;