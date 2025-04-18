
const Conversation = require("../../models/Conversation.js")
const ConversationDB = require("../../db/ConversationMongoDB.js")

const responseContext = (user, userid, items) => {
    return new Promise((resolve, reject) => {
        console.log("items", JSON.stringify(items))
        let productListText = "";
        if (items && items.products && Array.isArray(items.products)) {
            productListText = items.products.map(product => {
                let text = `Group Name: ${product.groupname}\n`;
                if (product.products && product.products.main && product.products.auxiliary) {
                    let mainProducts = product.products.main.map(p => p.title).join(', ');

                    let auxiliaryProducts = product.products.auxiliary.map(p => p.title).join(', ');

                    text += `Products: main - ${mainProducts}, auxiliary - ${auxiliaryProducts}\n`;
                } else {
                    text += `Products: {}\n`;
                }
                text += `Explanation: ${product.explanation}\n`;
                return text;
            }).join('\n');
        }


        let serviceListText = "";
        if (items && items.services && Array.isArray(items.services)) {
            serviceListText = items.services.map(service => {
                let text = `Group Name: ${service.services_name}\n`;
                if (service.similarServices && service.similarServices.length > 0) {
                    text += `Services: ${service.similarServices.join(', ')}\n`;
                } else {
                    text += `Services: {}\n`;
                }
                text += `Explanation: ${service.search_context}\n`;
                // Wrap the text in a span with green color for proper formatting
                return `<span style="color:green">${text}</span>`;
            }).join('\n');
        }

        let context = `Sen bir Cevap verme uzmanısın. 
                                        Görevin, ürün ve hizmet önerileri içeren bir JSON çıktısını analiz ederek, kullanıcıya gösterilecek **detaylı ve kişisel bir açıklama** üretmektir.

                                    ### Çıktı Kuralları:
                                    - Kullanıcıya neden bu ürünleri önerdiğini açıkla. Özellikler, kategoriler ve arama bağlamı hakkında bilgi ver. 3–4 cümle uzunluğunda olabilir.
                                    - Eğer Ana ürün bulunmuyorsa kullanıcıya aradığı ürün ile ilgili bir önerimiz olmadığını söyleyebilirsin.
                                    - Formatlama özelliklerini ve markdown özelliklerini daha iyi kullana bilirsin. kullanıcıya daha görsel bir çıktı üretebilirsin
                                

                                    - Markdown formatını etkin kullan:
                                    - Altına **kalın yazı**, *eğik yazı*, "kod bloğu", ve madde işaretleri ("-") gibi görsel öğeler kullan
                                    - Her soru bloğunun **arasında boşluk bırak**
                                    4. Dilersen 🟡, 🔵, ❓ gibi simgelerle stilistik öğeler ekle.
                                    6. Çıktının tamamı yalnızca **Markdown formatında** olsun. Ekstra açıklama verme.

                                    Kullanıcı İsmi :  ${user.name}


                                    Önerilen ;
                                    
                                    Ana ürün listesi :
                                    ${productListText} 

                                    ve 

                                    hizmet listesi :
                                    ${serviceListText} 
                                    
                                    ile birlikte, kullanıcıya önerilen ürünlerin detaylarını içeren bir formatlı bir Markdown çıktısı oluşturmalısın. Çıktıda bold paragraflar satırlar gerekirse altı çizili ve vurgulu bir metin olmalı.
                                   `;




        console.log("[RecomResponseAgent] Final context built.", context)
        resolve(context)

    })
}

module.exports = async (user, userid, items) => {
    return responseContext(user, userid, items)
}