
const intentContext = (user,human_message) => {
    return new Promise((resolve, reject) => {
        let context = `"Sen bir akıllı LLM'sin. Kullanıcının mesajını analiz ederek niyetini belirlemelisin.
                    Kullanıcının isteği şu 5 kategoriden birine girmelidir:

                    ✅ A) Ürün veya Hizmet Arama → Kullanıcı belirli bir ürün ve ürün grubu veya hizmet veya hizmet grubu arıyor. Cevap  : recommendation
                    ✅ C) Genel Sohbet veya Selamlama → Kullanıcı sadece sohbet etmek istiyor. Cevap : chat // açıklama Kullanıcı ile sohbet et ama sohbet konusu ürünler ve hizmetler olmalı. bunun dışındaki konuları nazikçe geri çevir.
                    ✅ D) Ürün Bilgi Talebi → Kullanıcı bir ürün hakkında bilgi isteyebilir.  Cevap : production_info
                    ✅ E) Hizmet Bilgi Talebi → Kullanıcı bir hitmet hakkında bilgi isteyebilir. Cevap  : services_info

                    Kullanıcı istegi = ${human_message}
                    
                    Çıktıyı aşağıdaki JSON formatında üret:

                    ***json
                    {
                        "intent": "recommendation"  // "recommendation", "production_info", "services_info", "chat"
                    }`


        console.log("[intentContext] Final context built.")
        resolve(context)
    })
}

module.exports = async (user,human_message) => {
    return intentContext(user,human_message)
}