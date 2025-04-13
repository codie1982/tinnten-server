
const responseContext = (search_context, mainProductList, auxiliaryProductList, serviceList) => {

    return new Promise((resolve, reject) => {

        let context = `Sen bir Cevap verme uzmanısın. 
                        Görevin, ürün ve hizmet önerileri içeren bir JSON çıktısını analiz ederek, kullanıcıya gösterilecek **detaylı ve kişisel bir açıklama** üretmektir.

                    ### Çıktı Kuralları:
                    - Kullanıcıya neden bu ürünleri önerdiğini açıkla. Özellikler, kategoriler ve arama bağlamı hakkında bilgi ver. 2–4 cümle uzunluğunda olabilir.
                    - Eğer Ana ürün bulunmuyorsa kullanıcıya aradığı ürün ile ilgili bir önerimiz olmadığını söyleyebilirsin.

                    ürün veya hizmet için arama terimi :  {search_context}

                    Önerilen ;
                    
                    Ana ürün listesi :
                    {productList} 

                    ve 

                    hizmet listesi :
                    {serviceList} 
                    
                    ile birlikte, kullanıcıya önerilen ürünlerin detaylarını içeren bir formatlı bir Markdown çıktısı oluşturmalısın. Çıktıda bold paragraflar satırlar gerekirse altı çizgili ve vurgulu bir metin olmalı. 

                   `





        context = context
            .replace("{search_context}", search_context ? search_context : "")

            .replace("{productList}", mainProductList ?
                mainProductList.map((item) => {
                    return `ürün başlığı : ${item.title}\n`
                }).join('') : "Ürün bulunmuyor")

            /* .replace("{helperList}", auxiliaryProductList ?
                auxiliaryProductList.map((item) => {
                    return `ürün başlığı : ${item.title}\n`
                }).join('') : "") */

            .replace("{serviceList}", serviceList ?
                serviceList.map((item) => {
                    return `Hizmet başlığı : ${item.title}\n`
                }).join('') : "")


        console.log("[responseContext] Final context built.")
        resolve(context)

    })
}

module.exports = async (search_context, mainProductList, auxiliaryProductList, serviceList) => {
    return responseContext(search_context, mainProductList, auxiliaryProductList, serviceList)
}

