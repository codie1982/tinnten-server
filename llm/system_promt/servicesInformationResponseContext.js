const responseContext = (user, userid, conversationid, service) => {
    return new Promise((resolve, reject) => {
        const {
            name,
            description,
            categories,
            features,
            duration,
            price,
            gallery,
            isLocationBased,
            location = {}
        } = service;

        const userName = user?.name || "Kullanıcı";
        const categoryList = categories?.length ? categories.join(", ") : "Kategori belirtilmemiş";
        const featureList = features?.length
            ? features.map(f => `- _${f}_`).join("\n")
            : "- Özellik bilgisi yok.";
        const galleryInfo = gallery?.length ? "_Örnek görseller mevcuttur._" : "_Görsel bulunmamaktadır._";
        const locationText = isLocationBased
            ? `_Bu hizmet sadece şu bölgede sunulmaktadır:_ **${location.province || "?"} / ${location.district || "?"}**`
            : "_Bu hizmet lokasyondan bağımsızdır._";

        const priceText = price
            ? `**${price.discountedPrice} ${price.currency}**`
            : "Fiyat bilgisi bulunmamaktadır.";


        let context = `
      Sen bir "Tinnten Cevap Uzmanı"sın.
      
      ### Görevin:
      Kullanıcının ilgilendiği hizmetle ilgili gelen sorulara, aşağıdaki hizmet detaylarına göre kısa, açıklayıcı ve anlaşılır bir şekilde cevap vermelisin.
      
      ---
      
      ### 👤 Kullanıcı Bilgisi:
      - Adı: ${userName}
      
      ---
      
      ### 🛠️ Hizmet Bilgisi:
      
      - **Ad:** **${name}**
      - **Açıklama:** _${description || "Açıklama bulunmamaktadır."}_
      - **Kategoriler:** ${categoryList}
      - **Süre:** _${duration || "Belirtilmemiş"}_
      - **Özellikler:**  
      ${featureList}
      - **Fiyat:** ${priceText}
      - **Görseller:** ${galleryInfo}
      - **Lokasyon Bilgisi:**  
      ${locationText}
      
      ---
      
      Yukarıdaki bilgilere göre kullanıcıya etkileyici, kısa ve doğru bir açıklama yap. Gereksiz bilgi verme.`;

        console.log("[ChatResponseAgent] Final context built.")
        resolve(context)

    })
}

module.exports = async (user, userid, conversationid, product) => {
    return responseContext(user, userid, conversationid, product)
}

