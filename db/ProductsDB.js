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

    async search(vector, limit) {
        //vector boyutu 768 model: sentence-transformers/paraphrase-multilingual-mpnet-base-v2
        try {
            const agg = [
                {
                    $vectorSearch: {
                        index: 'tinnten_product_vector_index',
                        path: 'vector',
                        queryVector: vector,
                        numCandidates: limit * 2, // Daha fazla aday alıyoruz
                        limit: limit,
                        metric: 'cosine'
                    }
                },
                {
                    $project: {
                        _id: 1,
                        title: 1,
                        score: { $meta: "vectorSearchScore" } // ✨ Skoru buradan alıyorsun
                    }
                }
            ];

            const result = await Product.aggregate(agg);
            return result;
        } catch (error) {
            throw new Error("MongoDB: Ürün güncellenirken hata oluştu - " + error.message);
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