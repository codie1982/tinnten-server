const Recommendation = require("../mongoModels/recommendationModel"); // Modeli içe aktar
const Question = require("../mongoModels/questionModel"); // Modeli içe aktar
const Product = require("../mongoModels/productsModel"); // Modeli içe aktar
const Service = require("../mongoModels/servicesModel"); // Modeli içe aktar
const CompanyProfile = require("../mongoModels/companyProfilModel"); // Modeli içe aktar
const Price = require("../mongoModels/priceModel"); // Modeli içe aktar
const Gallery = require("../mongoModels/galleryModel"); // Modeli içe aktar
const Image = require("../mongoModels/imagesModel"); // Modeli içe aktar
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
            let recom = await Recommendation.findOne(query).lean();
            if (!recom) throw new Error("Recommendation bulunamadı.");

            // 🔹 QUESTIONS
            if (recom.questions?.length > 0) {
                const questionList = await Question.find({ _id: { $in: recom.questions } }).lean();
                recom.questions = questionList;
            }
            // 🔹 PRODUCTS
            const allProductIds = recom.producsGroup?.flatMap(group =>
                [...(group.products?.main || []), ...(group.products?.auxiliary || [])]
            ) || [];

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
                        gallery.images = await Image.find({ _id: { $in: gallery.images } }).lean();
                    }
                    product.gallery = gallery;
                }

                productMap.set(product._id.toString(), product);
            }

            recom.producsGroup = recom.producsGroup?.map(group => ({
                ...group,
                products: {
                    main: (group.products?.main || []).map(id => productMap.get(id.toString())).filter(Boolean),
                    auxiliary: (group.products?.auxiliary || []).map(id => productMap.get(id.toString())).filter(Boolean)
                }
            }));

            // 🔹 SERVICES
            const allServiceIds = recom.servicesGroup?.flatMap(group =>
                [...(group.services?.main || []), ...(group.services?.auxiliary || [])]
            ) || [];

            const allServices = await Service.find({ _id: { $in: allServiceIds } }).lean();

            const serviceMap = new Map();
            allServices.forEach(service => serviceMap.set(service._id.toString(), service));

            recom.servicesGroup = recom.servicesGroup?.map(group => ({
                ...group,
                services: {
                    main: (group.services?.main || []).map(id => serviceMap.get(id.toString())).filter(Boolean),
                    auxiliary: (group.services?.auxiliary || []).map(id => serviceMap.get(id.toString())).filter(Boolean)
                }
            }));

            // 🔹 COMPANIES
            recom.companyGroup = await Promise.all(
                (recom.companyGroup || []).map(async group => {
                    if (group.companyies?.length > 0) {
                        const companies = await CompanyProfile.find({
                            _id: { $in: group.companyies }
                        }).lean();
                        return { ...group, companyies: companies };
                    }
                    return group;
                })
            );

            return recom;

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