
const intentSystemPrompt = (user, memory = [], scoped = {}) => {
    return new Promise((resolve, reject) => {
        const recent = memory.slice(-6)
            .map(m => `${m.role}: ${m.content}`)
            .join("\n");
        let context = `SEN TINNTEN’İN NİYET ÇIKARIM MOTORUSUN (INTENT ENGINE).

                        ### A. Yapman Gereken
                        1. Kullanıcının son mesajını ve son 3 konuşma satırını oku.
                        2. Tüm olası niyetleri (intent) üret; 0-N tane olabilir.
                        3. Her intent için **yalnızca gerekli alanları** doldur.
                        4. Ürün/hizmet ortak alanda ilerlemektedir. Yani product bir üründe olabilir bir hizmet de.
                        **5. Mevcut bağlam (context) ve durum (state) varsa, intent'leri bağlama uygun şekilde önceliklendir ve confidence skorlarını bağlam ağırlığına göre artır.**
                        **6. Çok aşamalı işlemler için (örneğin, teklif alma süreci), mevcut duruma (state) göre intent'leri sırala ve aşamalar arasında geçiş yap.**
                        **7. Kullanıcı açıkça konuyu değiştirmediği sürece (örneğin, "yeni ürün ara" gibi bir ifade), mevcut bağlam ve duruma sadık kal.**
                        **8. UI değişikliklerini, yalnızca 'productDetail', 'RecommendationArea' ve 'offerFormModal' panelleri için tanımla. 'chat' bloğu her zaman aktif olduğundan, bu panel için UI değişikliği belirtme.**

                        ### B. Geçerli Intent ve Tool Listesi
                        | intent              | tool adı           | açıklama |
                        |--------------------|--------------------|----------|
                        | recommendation      | ProductSuggestTool | ürün/hizmet önerisi |
                        | production_info     | ProductDetailTool  | seçili ürün/hizmet bilgisi |
                        | search_product      | ProductSearchTool  | metin/vektör ile ürün/hizmet arama |
                        | chat                | null               | genel sohbet |
                        | chatabouthproduct   | ProductUsageTool   | ürün/hizmet ile ne yapılır sohbeti |
                        | supplier_search     | SupplierSearchTool | tedarikçi/alıcı arama |
                        | offer_search        | OfferSearchTool    | ürün/hizmet bir arama |
                        | offer_form          | OfferFormTool      | teklif formu doldurma |
                        | offer_feedback      | OfferFeedbackTool  | teklif geri dönüşleri |
                        | offer_confirm       | OfferConfirmTool   | teklif onayı |

                        **Kurallar:**
                        - **confidence < 0.15 ise intent oluşturma.**
                        - **Belirsiz isteklerde (confidence < 0.4), "fallback.tool = 'QuestionTool'" ve uygun soru taslağı için "fallback.query" doldur.**
                        - **Sadece tablo‑daki intent ve tool adlarını kullan.**
                        - **conditions, nextTool ve retryTool alanlarını, uygun olduğunda doldur:**
                        - **conditions: Koşullu araç seçimleri için (örneğin, no_product, price_exceeds, no_supplier).**
                        - **nextTool: Sonraki araç çağrısı için (örneğin, fiyat aşılırsa öneri, teklif formu tamamlanırsa geri dönüş).**
                        - **retryTool: Tekrar deneme için (örneğin, arama başarısızsa).**
                        - **context: Bağlam, mevcut ürün, hizmet veya işlemle ilgili bilgileri (id, type, state, metadata) içerir.**
                        - **lockContext: Bağlam kilitliyse, intent'ler yalnızca mevcut bağlamla ilişkili olanlarla sınırlanır.**
                        - **state: Çok aşamalı işlemler için mevcut durumu (initial, search, form, feedback, confirmation) takip eder.**
                        - **Kullanıcı açıkça konuyu değiştirmezse, mevcut bağlam ve duruma sadık kal.**
                        - **ui_changes: Yalnızca 'productDetail', 'RecommendationArea' ve 'offerFormModal' panelleri için değişiklikleri tanımla. 'chat' bloğu her zaman aktif olduğundan, bu panel için UI değişikliği belirtme.**

                        ### D. Bağlam
                        **Seçili ürün/hizmet ID: ${scoped.selectedProduct || "no_product"}**  
                        **Bağlam: ${scoped.context || { id: "no_id", type: "no_context", state: "initial", lockContext: false, metadata: {} }}**  
                        **Son 3 mesaj: ${recent}**  
                        **Kullanıcı: ${user?.name || "Anonim"}**  

                        **YANITIN TAMAMINI, EK AÇIKLAMA OLMADAN, YALNIZCA ŞU JSON OLARAK DÖN:**  
                        **Kesinlikle: Başka hiçbir metin, yorum veya açıklama ekleme.**

                        ### C. JSON Çıktı Şeması
                        ***json
                        {
                            "intent": "<tablodaki intent>",
                            "tool": "<tablodaki tool adı veya null>",
                            "confidence": <0-1>,
                            "priority": <1-3>,
                            "related_id": "<varsa ürün/hizmet ID>",
                            "query": "<opsiyonel>",
                            "fallback": {
                                "tool": "<opsiyonel>",
                                "query": "<opsiyonel>"
                            },
                            "conditions": [
                                {
                                    "condition": "<koşul adı>",
                                    "tool": "<tool adı>",
                                    "query": "<sorgu>",
                                    "params": <object>
                                }
                            ],
                            "nextTool": {
                                "tool": "<tool adı>",
                                "query": "<sorgu>",
                                "condition": "<koşul adı>"
                            },
                            "retryTool": {
                                "tool": "<tool adı>",
                                "maxRetries": <sayı>,
                                "query": "<sorgu>"
                            },
                            "context": {
                                "id": "<ürün ID, teklif ID veya yok>",
                                "type": "<product, offer, supplier veya yok>",
                                "state": "<initial, search, form, feedback, confirmation>",
                                "lockContext": <true/false>,
                                "metadata": <object>
                            },
                            "ui_changes": {
                                "show": ["productDetail" | "RecommendationArea" | "offerFormModal"],
                                "hide": ["productDetail" | "RecommendationArea" | "offerFormModal"],
                                "update": {
                                    "productDetail": "<değer>",
                                    "RecommendationArea": "<değer>",
                                    "offerFormModal": "<değer>"
                                }
                            }
                        }
                        `.trim();


        console.log("[intentSystemPrompt] Final context built.")
        resolve(context)
    })
}

module.exports = async (user, memory = [], scoped = {}) => {
    return intentSystemPrompt(user, memory = [], scoped = {})
}

/**
 * let context = `
                    SEN TINNTEN’İN NİYET ÇIKARIM MOTORUSUN (INTENT ENGINE).
                    
                    ### A. Yapman Gereken
                    1. Kullanıcının son mesajını ve son 3 konuşma satırını oku.  
                    2. Tüm olası niyetleri (intent) üret; 0‑N tane olabilir.  
                    3. Her intent için **yalnızca gerekli alanları** doldur.
                    
                    ### B. Geçerli intent ve tool listesi
                    | intent | tool adı | açıklama |
                    | recommendation      | ProductSuggestTool | ürün/hizmet önerisi |
                    | production_info     | ProductDetailTool  | seçili ürün bilgisi |
                    | services_info       | ServiceDetailTool  | seçili hizmet bilgisi |
                    | search_product      | ProductSearchTool  | metin/vektör ile ürün arama |
                    | search_service      | ServiceSearchTool  | metin/vektör ile hizmet arama |
                    | chat                | null               | genel sohbet |
                    | chatabouthproduct   | ProductUsageTool   | ürünle ne yapılır sohbeti |
                    | chatabouthservices  | ServiceUsageTool   | hizmetle ilgili sohbet |
                    
                    Kurallar:  
                    • confidence < 0.15 ise intent oluşturma.  
                    • Belirsiz isteklerde (confidence < 0.4) "fallback.tool = "QuestionTool"" ve uygun soru taslağı için "fallback.query" doldur.  
                    • Sadece tablo‑daki intent & tool adlarını kullan.
                    
                    ### D. Bağlam
                    Seçili ürün ID  : ${scoped.selectedProduct || "yok"}  
                    Seçili hizmet ID: ${scoped.selectedService || "yok"}
                    
                    Son 3 mesaj:  
                    ${recent || "—"}
                    Kullanıcı: ${user?.name || "Anonim"}

                    Kullanıcı mesajı: "${human_message}"

                    YANITIN TAMAMINI, EK AÇIKLAMA OLMADAN, YALNIZCA ŞU JSON OLARAK DÖN:
                    Kesinlikle : Başka hiçbir metin, yorum veya açıklama ekleme.

                    ### C. JSON Çıktı Şeması
                    ***json
                    [
                        {
                        "intent": "<tablodaki intent>",
                        "tool":   "<tablodaki tool adı veya null>",
                        "confidence": <0‑1>,
                        "priority":  <1‑3>,
                        "related_id": "<varsa ürün/hizmet ID>",
                        "query":      "<opsiyonel>",
                        "fallback": {
                            "tool":  "<opsiyonel>",
                            "query": "<opsiyonel>"
                        }
                        }
                    ]
                    `.trim();

 */
/**
 * let context = `"Sen bir akıllı LLM'sin. Kullanıcının mesajını analiz ederek niyetini belirlemelisin.
                    Kullanıcının isteği şu 5 kategoriden birine girmelidir:

                    ✅ A) Ürün veya Hizmet Arama → Kullanıcı belirli bir ürün ve ürün grubu veya hizmet veya hizmet grubu arıyor. Cevap  : recommendation
                    ✅ C) Genel Sohbet veya Selamlama → Kullanıcı sadece sohbet etmek istiyor. Cevap : chat // açıklama Kullanıcı ile sohbet et ama sohbet konusu ürünler ve hizmetler olmalı. bunun dışındaki konuları nazikçe geri çevir.
                    ✅ D) Ürün Bilgi Talebi → Kullanıcı bir ürün hakkında bilgi isteyebilir.  Cevap : production_info
                    ✅ D) Kullancı bir ürün ile ilgili soru sorabilir veya ürün ile ilgili bilgi almak isteyebilir..  Cevap : chatabouthproduct
                    ✅ E) Hizmet Bilgi Talebi → Kullanıcı bir hitmet hakkında bilgi isteyebilir. Cevap  : services_info
                    ✅ E) Kullancı bir Hizmet ile ilgili bilgi almak isteyebilir ve hizmetler ile ilgili bilgi isteyebilir. Cevap : chatabouthservices
                    
                    Kullancı ismi = ${user?.name}
                    Kullanıcı istegi = ${human_message}
                    
                    Çıktıyı aşağıdaki JSON formatında üret:

                    ***json
                    {
                        "intent": "recommendation"  // "recommendation", "production_info", "services_info", "chat","chatabouthproduct","chatabouthservices",
                    }`
 */


/**
 * intent	tool adı	Ne işe yarar?	Neden gerekli?
 * 

comparison	            ProductCompareTool	    Aynı kategorideki iki‑üç ürünü özellik, fiyat, puan vb. açısından yan yana kıyaslar.    “Airfryer mı düdüklü tencere mi?” gibi karar soruları sık geliyor.
price_track	            PriceTrackTool	        Belirli bir ürün için fiyat değişimini izler, düşüş olduğunda uyarı kurar.	            Kullanıcı “Amazon pahalı, başka yerde düşer mi?” dediğinde doğal akış.
store_locator	        StoreLocatorTool	    Fiziksel mağaza veya yetkili servis bulur, harita ve mesafe döner.	                    “Kadıköy’de Calipso yedek conta satan yer var mı?” sorularında.
order_status	        OrderStatusTool	        Kullanıcının mevcut siparişinin kargo/teslimat durumunu çeker.	                        Platform içi alışveriş entegrasyonu varsa büyük ihtiyaç.
return_process	        ReturnTool	            İade/garanti süreci başlatır, gerekli adımları listeler.	                            Memnuniyetsiz kullanıcıyı çabuk yatıştırmak için.
warranty_info	        WarrantyInfoTool	    Ürünün garanti süresi, yetkili servis ve onarım maliyeti bilgisini döner.	            “Garantim bitti, anakart değişimi kaça olur?” gibi teknik sorulara net yanıt.
promotion_search	    PromotionTool	        Kupon, kampanya, indirim kodu veya bundle fırsatlarını listeler.	                    “Daha ucuza nereden alırım?” sorularında recommendation’dan farklı olarak indirim‐odaklı.
visual_search	        VisualSearchTool	    Kullanıcının yüklediği görselden benzer ürün/hizmet arar.	                            Görsel tabanlı talepler (oyuncak ayı fotoğrafı vb.) şu an fallback’a düşüyor.
installation_guide	    InstallationTool	    Ürünün kurulum / ilk kullanım talimatlarını adım adım döner.	                        “Bu robot süpürgeyi nasıl kurarım?” soruları chatabouthproduct’tan daha işlem‑odaklı.
accessory_suggest	    AccessorySuggestTool	Seçili ürün için uyumlu aksesuar, yedek parça, sarf malzemesi önerir.	                Satış sonrası çapraz satış (upsell) getiri sağlar.

 */