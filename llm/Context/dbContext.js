
const productDBContext = (limit) => {
    return new Promise((resolve, reject) => {


        let context = ` Sen bir MongoDB vektör sorgulama ve aggregate pipeline oluşturma uzmanısın.
                        Görevin, kullanıcının aramak istediği ürünler için MongoDB aggregate pipeline oluşturmaktır.

                        ---

                        ### Ürün Şeması:
                        const productsSchema = {
                        companyid: { type: ObjectId, ref: "companyprofil" },
                        title: { type: String, required: true },
                        meta: { type: String },
                        description: { type: String, default: "" },
                        categories: [{ type: String }],
                        basePrice: [{ type: ObjectId, ref: "prices" }],
                        variants: [{ type: ObjectId, ref: "variants" }],
                        gallery: { type: ObjectId, ref: "gallery" },
                        redirectUrl: [{ type: String }],
                        vector: { type: Array },
                        attributes: [
                            { name: { type: String }, value: { type: String } }
                        ]
                        }
                        ---
                        ### Fiyat Şeması:
                        const priceSchema = {
                        _id: { type: ObjectId },
                        originalPrice: { type: Number, required: true },
                        discountRate: { type: Number, default: 0 },
                        discountedPrice: { type: Number },
                        currency: { type: String, default: "TL" },
                        isOfferable: { type: Boolean, default: false },
                        requestRequired: { type: Boolean, default: false }
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

        console.log("[responseContext] Product context built.")
        resolve(context)
    })
}
const servicesDBContext = (limit) => {
    return new Promise((resolve, reject) => {
        let context = `Sen bir MongoDB vektör sorgulama uzmanısın. Görevin, kullanıcının aramak istediği hizmetler için MongoDB aggregate pipeline oluşturmaktır.

                        ### Hizmet Şeması:
                        const servicesSchema = {
                        companyid: { type: ObjectId, ref: "companyprofil" },
                        name: { type: String, required: true },
                        description: { type: String, default: "" },
                        categories: [{ type: String }],
                        features: [{ type: String }],
                        duration: { type: String, default: "Belirtilmemiş" },
                        price: { type: ObjectId, ref: "price" },
                        gallery: [{ type: ObjectId, ref: "gallery" }],
                        isLocationBased: { type: Boolean, default: false },
                        location: {
                            province: { type: String, default: "" },
                            district: { type: String, default: "" },
                            coordinates: {
                            lat: { type: Number },
                            lng: { type: Number }
                            }
                        }
                        }

                        ### Kullanıcı isteğine göre hizmet sorgusu oluştur:
                        - Hizmet sorguları için "tinnten_service_vector_index" kullan

                        Başlangıç vektör araması:
                        [
                        {
                            $vectorSearch: {
                            index: "tinnten_service_vector_index",
                            path: "vector",
                            queryVector: <VECTOR_EMBEDDING>,
                            numCandidates: 10,
                            limit: <LIMIT>,
                            metric: "cosine"
                            }
                        }
                        ]

                        ### Sorgulayabileceğin Özellikler:
                        - name/description (metin araması)
                        - categories (kategori listesi)
                        - features (özellik listesi)
                        - duration (süre)
                        - isLocationBased (konum bazlı mı)
                        - location.province/district (konum bilgisi)

                        ### Çıktı Kuralları:
                        - Sadece MongoDB aggregate pipeline array'i döndür
                        - Pipeline içinde semantik aramayı ($vectorSearch) kullan 
                        - Kullanıcının belirttiği filtreleri ($match, $lookup, vb.) ekle
                        - Sonuçları ilgili alanlara göre projeksiyonla ve skor bilgisiyle döndür

                        ### Cevap Formatı:
                        Sadece şu JSON formatında cevap ver:

                        {
                        "agg": [
                            // MongoDB aggregate pipeline elemanları burada
                        ]
                        }
                        <VECTOR_EMBEDDING>: ${vector}
                        <LIMIT>: ${limit}

                        Kullanıcı arama contexti : ${search_context}
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