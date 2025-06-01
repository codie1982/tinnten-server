const mongoose = require("mongoose");
const Product = require("../mongoModels/productsModel"); // Ürün modelini içe aktar
const Variant = require("../mongoModels/variantsModel"); // Ürün modelini içe aktar
const Price = require("../mongoModels/priceModel"); // Ürün modelini içe aktar
const Gallery = require("../mongoModels/galleryModel"); // Ürün modelini içe aktar
const Image = require("../mongoModels/imagesModel"); // Ürün modelini içe aktar
const CompanyProfile = require("../mongoModels/companyProfilModel"); // Ürün modelini içe aktar
const BaseDB = require("./BaseDB");

class ProductsDB extends BaseDB {
    async create(data) {
        try {
            const product = new Product(data);
            return await product.save();
        } catch (error) {
            throw new Error("MongoDB: Ürün oluşturulurken hata oluştu - " + error.message);
        }
    }

    async read(query) {
        try {
            const product = await Product.findOne(query).lean();
            if (!product) throw new Error("Ürün bulunamadı.");

            // 🔹 companyid
            if (product.companyid) {
                product.companyid = await CompanyProfile.findById(product.companyid).lean();
            }

            // 🔹 basePrice (Array)
            if (product.basePrice?.length > 0) {
                product.basePrice = await Price.find({ _id: { $in: product.basePrice } }).lean();
            } else {
                product.basePrice = [];
            }

            // 🔹 variants (Array)
            if (product.variants?.length > 0) {
                product.variants = await Variant.find({ _id: { $in: product.variants } }).lean();
            } else {
                product.variants = [];
            }

            // 🔹 gallery (ObjectId)
            if (product.gallery) {
                const gallery = await Gallery.findById(product.gallery, { description: 0 }).lean();
                if (gallery?.images?.length > 0) {
                    gallery.images = await Image.find({ _id: { $in: gallery.images } }).lean();
                }
                product.gallery = gallery;
            }

            return product;

        } catch (error) {
            throw new Error("MongoDB: Ürün getirilirken hata oluştu - " + error.message);
        }
    }

    async light(query) {
        try {
            const product = await Product.findOne(query).lean();
            if (!product) throw new Error("Ürün bulunamadı.");
            return product;

        } catch (error) {
            throw new Error("MongoDB: Ürün getirilirken hata oluştu - " + error.message);
        }
    }

    async update(query, updateData) {
        try {
            return await Product.findOneAndUpdate(
                query,
                { $set: updateData },
                { new: true }
            );
        } catch (error) {
            throw new Error("MongoDB: Ürün güncellenirken hata oluştu - " + error.message);
        }
    }

    async delete(query) {
        try {
            return await Product.deleteOne(query); // Kalıcı silme işlemi
        } catch (error) {
            throw new Error("MongoDB: Ürün silinirken hata oluştu - " + error.message);
        }
    }

    async recover(query) {
        throw new Error("MongoDB: Silinen ürünleri geri getirme desteklenmiyor!");
    }
    async search(query, matchFilter = {}) {
        try {
            const agg = [];

            // [0] Eğer match filtresi varsa ekle
            if (Object.keys(matchFilter).length > 0) {
                agg.push({ $match: matchFilter });
            }

            // [1] Full-text arama
            agg.push({
                $search: {
                    index: 'default', // Eğer özel bir search index kullandıysan burayı belirt
                    text: {
                        query: query,
                        path: ["title", "description", "categories"]
                    }
                }
            });

            // [2] Sonuç sayısını sınırlama
            agg.push({ $limit: 3 });

            // [3] Hangi alanları döneceğini belirle
            agg.push({
                $project: {
                    _id: 1,
                    title: 1,
                    score: { $meta: "searchScore" } // Bonus: skor bilgisi
                }
            });

            const result = await Product.aggregate(agg);
            return result;
        } catch (error) {
            throw new Error("MongoDB: Ürün arama işlemi sırasında hata oluştu - " + error.message);
        }
    }
    async searchVector(vector, limit, matchFilter = {}) {
        try {
            const pipeline = [];

            // [1] Vektörel arama
            pipeline.push({
                $vectorSearch: {
                    index: 'tinnten_product_vector_index',
                    path: 'vector',
                    queryVector: vector,
                    numCandidates: limit * 2,
                    limit: limit,
                    metric: 'cosine'
                }
            });
            // [0] Eğer match filtresi varsa ekle
            if (Object.keys(matchFilter).length > 0) {
                pipeline.push({ $match: matchFilter });
            }
            // [2] Projeksiyon
            pipeline.push({
                $project: {
                    _id: 1,
                    title: 1,
                    companyid: 1,
                    categories: 1,
                    type: 1,
                    pricetype: 1,
                    score: { $meta: "vectorSearchScore" }
                }
            });

            const result = await Product.aggregate(pipeline);
            return result;
        } catch (error) {
            throw new Error("MongoDB: Ürün aramasında hata oluştu - " + error.message);
        }
    }

    async searchFromAgent(agg) {
        try {
            //console.log("searchFromAgent", agg)
            //console.log("searchFromAgent", JSON.stringify(agg))
            const result = await Product.aggregate(agg);
            return result;
        } catch (error) {
            throw new Error("MongoDB: Ürün Aramalarında hata oluştu - " + error.message);
        }
    }
}

module.exports = ProductsDB;