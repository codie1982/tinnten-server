const mongoose = require("mongoose");
const FormFields = require("../mongoModels/formFieldModel"); // Ürün modelini içe aktar

const BaseDB = require("./BaseDB");

class FormFieldsDB extends BaseDB {
    async create(data) {
        try {
            const formfield = new FormFieldsDB(data);
            return await formfield.save();
        } catch (error) {
            throw new Error("MongoDB: Ürün oluşturulurken hata oluştu - " + error.message);
        }
    }


    async light(query) {
        try {
            const result = await FormFieldsDB.findOne(query).lean();
            if (!result) throw new Error("Ürün bulunamadı.");
            return result;

        } catch (error) {
            throw new Error("MongoDB: Ürün getirilirken hata oluştu - " + error.message);
        }
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

    async searchVector(vector, limit = 5, matchFilter = {}) {
        try {
          const agg = [
            {
              $vectorSearch: {
                index: "tinnten_formfied_vector_index",
                path: "vector",
                queryVector: vector,
                numCandidates: 100,
                limit,
                metric: 'cosine',
                filter: matchFilter
              }
            },
            {
              $project: {
                _id: 1,
                label: 1,
                productid: 1,
                score: { $meta: "vectorSearchScore" }
              }
            }
          ];
      
          //console.log("[FormFieldsDB] Vektörel arama sorgusu:", JSON.stringify(agg, null, 2));
          const result = await FormFields.aggregate(agg);
          return result;
      
        } catch (err) {
          throw new Error("MongoDB: Ürün aramasında hata oluştu - " + err.message);
        }
      }
}

module.exports = FormFieldsDB;