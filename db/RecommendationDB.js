const Recommendation = require("../mongoModels/recommendationModel"); // Modeli içe aktar
const BaseDB = require("./BaseDB");

class RecommendationDB extends BaseDB {
    async create(data) {
        try {
            console.log("[RecommendationDB] Data to be saved:", data);
            const recommendation = new Recommendation(data);
            return await recommendation.save();
        } catch (error) {
            throw new Error("MongoDB: Öneri oluşturulurken hata oluştu - " + error.message);
        }
    }

    async read(query) {
        try {
            return await Recommendation.findOne(query)
                .populate("products")
                .populate("services")
                .populate("companyies");
        } catch (error) {
            throw new Error("MongoDB: Öneri getirilirken hata oluştu - " + error.message);
        }
    }

    async update(query, updateData) {
        try {
            return await Recommendation.findOneAndUpdate(
                query,
                { $set: updateData },
                { new: true }
            );
        } catch (error) {
            throw new Error("MongoDB: Öneri güncellenirken hata oluştu - " + error.message);
        }
    }

    async delete(query) {
        try {
            return await Recommendation.deleteOne(query); // Kalıcı silme işlemi
        } catch (error) {
            throw new Error("MongoDB: Öneri silinirken hata oluştu - " + error.message);
        }
    }

    async recover(query) {
        throw new Error("MongoDB: Silinen önerileri geri getirme desteklenmiyor!");
    }
}

module.exports = RecommendationDB;