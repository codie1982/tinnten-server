const mongoose = require("mongoose");
const CompanyProfile = require("../mongoModels/companyModel"); // Company modelini içe aktar
const BaseDB = require("./BaseDB");

class CompanyProfileDB extends BaseDB {
    async create(data) {
        try {
            const company = new CompanyProfile(data);
            return await company.save();
        } catch (error) {
            throw new Error("MongoDB: Şirket oluşturulurken hata oluştu - " + error.message);
        }
    }

    async read(query) {
        try {
            return await CompanyProfile.findOne(query)
                .populate("userid")
                .populate("logo")
                .populate("phone")
                .populate("address")
                .populate("social")
                .populate("accounts")
                .populate("products")
                .populate("services")
                .populate("documents")
                .populate("galleries")
                .populate("contents");
        } catch (error) {
            throw new Error("MongoDB: Şirket bilgisi getirilirken hata oluştu - " + error.message);
        }
    }

    async update(query, updateData) {
        try {
            return await CompanyProfile.findOneAndUpdate(
                query,
                { $set: updateData },
                { new: true }
            );
        } catch (error) {
            throw new Error("MongoDB: Şirket bilgisi güncellenirken hata oluştu - " + error.message);
        }
    }

    async delete(query) {
        try {
            return await CompanyProfile.deleteOne(query); // Kalıcı silme işlemi
        } catch (error) {
            throw new Error("MongoDB: Şirket bilgisi silinirken hata oluştu - " + error.message);
        }
    }

    async recover(query) {
        throw new Error("MongoDB: Silinen şirketleri geri getirme desteklenmiyor!");
    }
}

module.exports = CompanyProfileDB;