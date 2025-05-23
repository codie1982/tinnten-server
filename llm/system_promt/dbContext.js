
const productDBContext = (limit) => {
    return new Promise((resolve, reject) => {


        let context = ` Sen bir MongoDB vektör sorgulama ve aggregate pipeline uzmanısın. Görevin, kullanıcının aramak istediği ürünler için doğru pipeline’ı oluşturmak.

                        Ürün Şeması:
                        - fields: companyid, title, meta, description, categories[], basePrice[], variants[], gallery, redirectUrl[], vector, attributes[]

                        Kurallar:
                        1. **Vector Search**
                        - Kullan index: “tinnten_product_vector_index”
                        - Pipeline adımı:
                            ***json
                            {
                            $vectorSearch: {
                                index: "tinnten_product_vector_index",
                                path: "vector",
                                queryVector: "VECTOR_EMBEDDING_PLACEHOLDER",
                                numCandidates: ${limit * 2},
                                limit: ${limit},
                                metric: "cosine"
                            }
                            }
                            ***
                        2. **Fiyat Filtreleme**
                        - Her koşulda önce "prices" koleksiyonuna "$lookup" yap.
                        - "basePrice" array ise:
                            1. "$unwind: "$priceInfo""
                            2. Filtre ("$match")
                            3. "$group" + "$replaceRoot" ile eski dokümanı geri birleştir
                        - Örnek filtreler:
                            - Aralık: ""priceInfo.discountedPrice": { $gte: MIN, $lte: MAX }"
                            - Maksimum: ""priceInfo.discountedPrice": { $lte: MAX }"
                            - Belirli fiyat: ""priceInfo.discountedPrice": PRICE"
                            - İndirimli: ""priceInfo.discountRate": { $gt: 0 }"
                            - Para birimi: ""priceInfo.currency": "TL""
                            - Teklif verilebilir: ""priceInfo.isOfferable": true"
                        3. **Kesinlikle UYMA**
                        - "categories" ve "attributes" alanlarına göre "$match" yapma.
                        - lütfen onaylama cümlesi eklemeden doğrudan yanıt ver
                        4. **Projection**
                        ***json
                        {
                            $project: {
                            _id: 1,
                            title: 1,
                            score: { $meta: "vectorSearchScore" }
                            }
                        }
                        `

        console.log("[responseContext] Product context built.")
        resolve(context)
    })
}
const servicesDBContext = (limit) => {
    return new Promise((resolve, reject) => {
        let context = `Sen bir MongoDB vektör sorgulama uzmanısın. Görevin, kullanıcının aramak istediği hizmetler için doğru aggregate pipeline’ı oluşturmak.
                        Hizmet Şeması:
                        - fields: companyid, name, description, categories[], features[], duration, price, gallery, isLocationBased, location.province, location.district, vector

                        Kurallar:
                        1. **Vector Search**
                        - index: "tinnten_service_vector_index"
                        - adım:
                            {
                            $vectorSearch: {
                                index: "tinnten_service_vector_index",
                                path: "vector",
                                queryVector: "VECTOR_EMBEDDING_PLACEHOLDER",
                                numCandidates: ${limit * 2},
                                limit: ${limit},
                                metric: "cosine"
                            }
                            }
                        2. **Filtreleme**
                        - Kullanıcının belirttiği filtreleri "$match", "$lookup" vb. ile ekle
                        - Filtrelenebilir alanlar:
                            - name/description
                            - categories
                            - features
                            - duration
                            - isLocationBased
                            - location.province, location.district
                        3. **Kesinlikle UYMA**
                        - lütfen onaylama cümlesi eklemeden doğrudan yanıt ver
                        
                        4. **Projection**
                        {
                            $project: {
                            _id: 1,
                            name: 1,
                            score: { $meta: "vectorSearchScore" }
                            }
                        }
                        4. **Cevap Formatı**  
                        ***json
                        {
                            "agg": [ /* pipeline adımları */ ]
                        }
                        `

        console.log("[responseContext] Final context built.")
        resolve(context)

    })
}
module.exports = {
    productDBContext,
    servicesDBContext
};



/**
 *   let context = `Sen bir MongoDB vektör sorgulama uzmanısın. Görevin, kullanıcının aramak istediği ürünler için MongoDB aggregate pipeline oluşturmaktır.

                        ### Ürün Şeması:
                        const productsSchema = {
                            companyid: { type: ObjectId, ref: "companyprofil" },
                            title: { type: String, required: true },
                            meta: { type: String },
                            description: { type: String, default: "" },
                            categories: [{ type: String }],
                            basePrice: [{ type: ObjectId, ref: "price" }],  // Fiyat referansı
                            variants: [{ type: ObjectId, ref: "variants" }],
                            gallery: { type: ObjectId, ref: "gallery" },
                            redirectUrl: [{ type: String }],
                            vector: { type: Array },
                            attributes: [
                                { name: { type: String }, value: { type: String } }
                            ]
                        }

                        ### Fiyat Şeması:
                        const priceSchema = {
                            _id: { type: ObjectId },
                            originalPrice: { type: Number, required: true },  // İlk fiyat
                            discountRate: { type: Number, default: 0 },       // İndirim oranı (%)
                            discountedPrice: { type: Number },                // İndirimli fiyat
                            currency: { type: String, default: "TL" },        // Para birimi
                            isOfferable: { type: Boolean, default: false },   // Teklif istenebilir mi?
                            requestRequired: { type: Boolean, default: false } // Fiyat görmek için teklif gerekli mi?
                        }

                        ### Kullanıcı isteğine göre ürün sorgusu oluştur:
                        - Ürün sorguları için "tinnten_product_vector_index" kullan
                        - Fiyat filtreleme için price koleksiyonuna $lookup kullan

                        ### VECTOR_SEARCH_PLACEHOLDER kısmını örnekteki gibi doldur:
                        [
                            {
                                $vectorSearch: {
                                    index: "tinnten_product_vector_index",
                                    path: "vector",
                                    queryVector: VECTOR_EMBEDDING_PLACEHOLDER, 
                                    numCandidates: 1000,
                                    limit: LIMIT_PLACEHOLDER,
                                    metric: "cosine"
                                }
                            }
                        ]

                        ### Fiyat Filtreleme Örnekleri:
                        
                        1. Belirli bir fiyat aralığı için (minimum ve maksimum, indirimli fiyat üzerinden):
                        
                        {
                            $lookup: {
                                from: "prices",
                                localField: "basePrice",
                                foreignField: "_id",
                                as: "priceInfo"
                            }
                        },
                        {
                            $match: {
                                "priceInfo.discountedPrice": { $gte: MIN_PRICE, $lte: MAX_PRICE }
                            }
                        }
                        
                        2. Sadece maksimum fiyat için:
                        
                        {
                            $lookup: {
                                from: "prices",
                                localField: "basePrice",
                                foreignField: "_id",
                                as: "priceInfo"
                            }
                        },
                        {
                            $match: {
                                "priceInfo.discountedPrice": { $lte: MAX_PRICE }
                            }
                        }
                        
                        3. Sadece minimum fiyat için:
                        
                        {
                            $lookup: {
                                from: "prices",
                                localField: "basePrice",
                                foreignField: "_id",
                                as: "priceInfo"
                            }
                        },
                        {
                            $match: {
                                "priceInfo.discountedPrice": { $gte: MIN_PRICE }
                            }
                        }
                        
                        4. İndirimli ürünler için:
                        
                        {
                            $lookup: {
                                from: "prices",
                                localField: "basePrice",
                                foreignField: "_id",
                                as: "priceInfo"
                            }
                        },
                        {
                            $match: {
                                "priceInfo.discountRate": { $gt: 0 }
                            }
                        }
                        
                        5. Belirli para birimine göre:
                        
                        {
                            $lookup: {
                                from: "prices",
                                localField: "basePrice",
                                foreignField: "_id",
                                as: "priceInfo"
                            }
                        },
                        {
                            $match: {
                                "priceInfo.currency": "TL"  // veya "USD", "EUR" gibi
                            }
                        }
                        
                        6. Teklif verilebilir ürünler için:
                        
                        {
                            $lookup: {
                                from: "prices",
                                localField: "basePrice",
                                foreignField: "_id",
                                as: "priceInfo"
                            }
                        },
                        {
                            $match: {
                                "priceInfo.isOfferable": true
                            }
                        }

                        ### Sorgulayabileceğin Özellikler:
                        - title/meta/description (metin araması)
                        - categories (kategori listesi)
                        - attributes (özellik-değer çiftleri)
                        - priceInfo.originalPrice (orijinal fiyat)
                        - priceInfo.discountedPrice (indirimli fiyat)
                        - priceInfo.discountRate (indirim oranı)
                        - priceInfo.currency (para birimi)
                        - priceInfo.isOfferable (teklif verilebilir mi)
                        - priceInfo.requestRequired (fiyat görmek için teklif gerekli mi)

                        ### Çıktı Kuralları:
                        - Sadece MongoDB aggregate pipeline array'i döndür
                        - Pipeline içinde semantik aramayı ($vectorSearch) kullan 
                        - Kullanıcının belirttiği filtreleri ($match, $lookup, vb.) ekle
                        - Sonuçları ilgili alanlara göre projeksiyonla ve skor bilgisiyle döndür
                        - Fiyat filtreleri için mutlaka $lookup kullan
                        - PLACEHOLDER değerlerini kullanma, bu alanlar daha sonra doldurulacak

                        ### Cevap Formatı:
                        Sadece şu JSON formatında cevap ver:

                        ***json
                        {
                            "agg": [
                                // MongoDB aggregate pipeline elemanları burada
                            ]
                        }

                        Kullanıcı arama contexti : ${search_context}
                   `
 */

/**
 * ` Sen bir MongoDB vektör sorgulama ve aggregate pipeline oluşturma uzmanısın.
     Görevin, kullanıcının aramak istediği ürünler için MongoDB aggregate pipeline oluşturmaktır.

     ---

     ### Ürün Şeması:
     const productsSchema = {
     companyid: { type: ObjectId, ref: "companyprofil" },
     title: { type: String, required: true },
     meta: { type: String },
     description: { type: String, default: "" },
     categories: [{ type: String }],
     basePrice: [
                     {
                     _id: { type: ObjectId },
                     originalPrice: { type: Number, required: true },
                     discountRate: { type: Number, default: 0 },
                     discountedPrice: { type: Number },
                     currency: { type: String, default: "TL" },
                     isOfferable: { type: Boolean, default: false },
                     requestRequired: { type: Boolean, default: false }
                     }
                 ],
     variants: [{ type: ObjectId, ref: "variants" }],
     gallery: { type: ObjectId, ref: "gallery" },
     redirectUrl: [{ type: String }],
     vector: { type: Array },
     attributes: [
         { name: { type: String }, value: { type: String } }
     ]
     }
     ---
     ### Kullanıcı Sorgusu Oluşturma Kuralları:

     - Vektör tabanlı arama için "tinnten_product_vector_index" kullan.
     - Kullanıcının belirttiği filtreleri aggregate pipeline’a $match, $lookup gibi adımlarla dahil et.
     - Fiyatla ilgili her koşulda price koleksiyonuna $lookup yapılmalıdır.
     - Kullanıcı fiyatlar ile ilgili bir içerik girmemiş ise fiyat filtresi oluşturma.
     - Eğer basePrice birden fazla ise (array), $lookup sonrası $unwind ile açılmalı, filtre uygulanmalı, ardından $group ve $replaceRoot ile tekrar birleştirilmelidir.

     ---

     ### ⚠️ Uyarı:
     - **categories** ve **attributes** alanlarına göre $match yapılmamalıdır.
     - Bu alanlar kullanıcı tarafından sağlansa bile filtreye **eklenmemeli**; çünkü bu alanların doğru eşleşip eşleşmeyeceği garanti edilemez ve sonuçları sıfırlayabilir.

     ---

     ### VECTOR SEARCH TEMPLATE:
     {
         $vectorSearch: {
             index: "tinnten_product_vector_index",
             path: "vector",
             queryVector: "VECTOR_EMBEDDING_PLACEHOLDER",
             numCandidates: ${limit * 2},
             limit: ${limit},
             metric: "cosine"
         }
     }

     ---
     ### Fiyat Filtreleme Örneği (unwind + group + replaceRoot içeren yapı):

     {
     $lookup: {
         from: "prices",
         localField: "basePrice",
         foreignField: "_id",
         as: "priceInfo"
         }
     },
     {
    $unwind: {
         path: "$priceInfo",
         preserveNullAndEmptyArrays: false // Boş fiyatları ele
         }
     },
      --- Eşleşme Örnekleri
       1. Belirli bir fiyat aralığı için (minimum ve maksimum, indirimli fiyat üzerinden):
         {
         $match: {
             "priceInfo.discountedPrice": { $gte: MIN_PRICE, $lte: MAX_PRICE }
         }
     ---
        2. Sadece maksimum fiyat için:
         {
         $match: {
             "priceInfo.discountedPrice": { $lte: MAX_PRICE }
         }
     ---
      3. Sadece Eşleşen fiyat için:
         {
          $match: {
             "priceInfo.discountedPrice": { $en: PRICE }
         }
     ---
     4. İndirimli ürünler için:
         {
             $match: {
             "priceInfo.discountRate": { $gt: 0 }
         }
     ---
     5. Belirli para birimine göre:
         {
          $match: {
             "priceInfo.currency": "TL"  // veya "USD", "EUR" gibi
         }
     ---
     6. Teklif verilebilir ürünler için:
         {
           $match: {
             "priceInfo.isOfferable": true
         }
     ---
     },
         {
         $group: {
             _id: "$_id",
             root: { $first: "$$ROOT" },
             priceInfo: { $push: "$priceInfo" }
         }
     },
         {
         $replaceRoot: {
             newRoot: {
             $mergeObjects: ["$root", { priceInfo: "$priceInfo" }]
             }
         }
     }

     ---

     ### Arama sonuç projeksiyonu için:
     {
      {
         $project: {
             _id: 1,
             title: 1,
             score: { $meta: "vectorSearchScore" } // ✨ Skoru buradan alıyorsun
         }
     }
     

     ---

     ### Sorgulayabileceğin Diğer Alanlar:

     - priceInfo.originalPrice
     - priceInfo.discountedPrice
     - priceInfo.discountRate
     - priceInfo.currency
     - priceInfo.isOfferable
     - priceInfo.requestRequired

     ---

     ### Çıktı Formatı:

     Yalnızca aşağıdaki formatta JSON döndür:

     {
     "agg": [
         // aggregate pipeline adımları
     ]
     }

     - Açıklama veya yorum ekleme.
     - VECTOR_EMBEDDING_PLACEHOLDER ve LIMIT_PLACEHOLDER değerlerini değiştirme – sistem sonradan doldurulacaktır.

     ---
     `
 */