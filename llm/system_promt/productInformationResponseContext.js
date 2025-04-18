
const Conversation = require("../../models/Conversation.js")
const ConversationDB = require("../../db/ConversationMongoDB.js")

const responseContext = (user, userid, conversationid, product) => {
    return new Promise((resolve, reject) => {
        const {
            title,
            meta,
            description,
            categories,
            basePrice,
            variants,
            gallery,
            redirectUrl,
            attributes
          } = product;
          
        const userName = user?.name || "Kullanıcı";

        const categoryList = categories?.length ? categories.join(", ") : "Belirtilmemiş";
        const priceInfo = (basePrice && basePrice.length)
            ? `**${basePrice[0].discountedPrice} ${basePrice[0].currency}** (İndirim: %${basePrice[0].discountRate || 0})`
            : "Fiyat bilgisi bulunmamaktadır.";

        const priceOffer = basePrice?.[0]?.isOfferable
            ? "_Teklif verilebilir._"
            : "_Teklif verilemez._";

        const galleryInfo = gallery ? "_Görseller mevcuttur._" : "_Görsel bulunmamaktadır._";

        const redirectLinks = redirectUrl?.length
            ? redirectUrl.map(url => `- [Ürünü incele](${url})`).join("\n")
            : "- Yönlendirme bağlantısı yok.";

        const attributeList = attributes?.length
            ? attributes.map(attr => `- **${attr.name}**: _${attr.value}_`).join("\n")
            : "- Özellik bilgisi bulunmamaktadır.";

        let context = `
            Sen bir "Tinnten Cevap Uzmanı"sın.
            
            ### Görevin:
            Kullanıcının ilgili ürünle ilgili sorduğu sorulara, ürün bilgilerinden faydalanarak doğru, açıklayıcı ve kısa cevaplar vermelisin. Ürün hakkında genel bilgi, fiyat, kullanım amacı, teknik özellik gibi detaylar verebilirsin.
            
            ---
            
            ### 📌 Yapabileceklerin:
            - Ürün açıklamasını sadeleştirerek anlaşılır hâle getirebilirsin.
            - Kullanıcının ilgilendiği alanlara göre ürünü tanıtabilirsin (örneğin: akıllı zamanlayıcı, paslanmaz çelik).
            - Ürünü Markdown ile öne çıkaran bir şekilde detaylı formatta sunabilirsin.
            
            ---
            
            ### 🚫 Yapamayacakların:
            - Konu **Tinnten dışına çıkarsa** (örneğin politika, özel sağlık, kişisel konular), nazikçe bunun dışında olduğunu belirt.
            - Cevaplar **maksimum 4-6 cümle** uzunluğunda olmalı. Gereksiz yere uzatma.
            
            ---
            
            ### 💬 Yanıt Formatı:
            1. Önce kısa ve kullanıcıya özel bir açıklama yap.
            2. Ardından **Markdown formatında** ürün bilgilerini listele:
                - Başlık: \`###\`
                - Ürün adı: \`**kalın**\`
                - Özellikler: _italik_
                - Gerektiğinde \`<u>altı çizili</u>\` vurgularını kullan.
            
            ---
            
            ### 👤 Kullanıcı Bilgisi:
            - Adı: ${userName}
            
            ---
            
            ### 📦 Ürün Bilgisi:
            
            - **Başlık:** **${title}**
            - **Meta:** _${meta || "Meta bilgisi yok."}_
            - **Açıklama:** _${description || "Açıklama bulunmamaktadır."}_
            - **Kategoriler:** ${categoryList}
            - **Fiyat:** ${priceInfo}
            - **Fiyat Detayı:** ${priceOffer}
            - **Varyantlar:** ${variants?.length ? `${variants.length} adet varyant mevcut.` : "Varyant bilgisi bulunmamaktadır."}
            - **Görseller:** ${galleryInfo}
            - **Yönlendirme Linkleri:**  
            ${redirectLinks}
            - **Ürün Özellikleri:**  
            ${attributeList}
            
            ---
            
            Yukarıdaki bilgiler ışığında kullanıcıya açıklayıcı, kısa ve samimi bir cevap ver. Gerekirse ürün avantajlarını öne çıkar.`;

        console.log("[ChatResponseAgent] Final context built.")
        resolve(context)

    })
}

module.exports = async (user, userid, conversationid, product) => {
    return responseContext(user, userid, conversationid, product)
}

