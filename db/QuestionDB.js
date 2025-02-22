const Question = require("../mongoModels/questionModel"); // Question modelini içe aktar
const BaseDB = require("./BaseDB");

class QuestionDB extends BaseDB {
    async create(data) {
        try {
            const question = new Question(data);
            return await question.save();
        } catch (error) {
            throw new Error("MongoDB: Soru oluşturulurken hata oluştu - " + error.message);
        }
    }

    async read(query) {
        try {
            return await Question.findOne(query);
        } catch (error) {
            throw new Error("MongoDB: Soru getirilirken hata oluştu - " + error.message);
        }
    }

    async update(query, updateData) {
        try {
            return await Question.findOneAndUpdate(
                query,
                { $set: updateData },
                { new: true }
            );
        } catch (error) {
            throw new Error("MongoDB: Soru güncellenirken hata oluştu - " + error.message);
        }
    }

    async delete(query) {
        try {
            return await Question.deleteOne(query); // Soruyu kalıcı olarak sil
        } catch (error) {
            throw new Error("MongoDB: Soru silinirken hata oluştu - " + error.message);
        }
    }

    async recover(query) {
        throw new Error("MongoDB: Silinen soruları geri getirme desteklenmiyor!");
    }
}

module.exports = QuestionDB;