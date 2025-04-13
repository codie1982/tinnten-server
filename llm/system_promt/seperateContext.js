
const seperateContext = (productList, search_context) => {
    return new Promise((resolve, reject) => {


        let context = ` Sen bir ürün ayırma uzmanısın.
                        Görevin, ürün listesi içinde kullanıcının isteğine göre ürünleri ayırıp kalan ürünleri yan ürün olarak listelemen.

                        ---

                        ### Ürün Listesi:
                        {productList}

                        ### Kullanıcı İsteği:
                        Kullanıcıdan gelen isteği anlamaya çalış ve ürünleri ana ürün ve yan ürün olarak ayır.
                        Ana ürünler, kullanıcının isteğine göre en uygun olanlardır. Yan ürünler ise ana ürünle birlikte kullanılabilecek yardımcı ürünlerdir.
                        Örneğin, bir kullanıcı bir telefon almak istiyorsa, ana ürün telefon olurken, yan ürünler ise telefon kılıfı, ekran koruyucu gibi ürünlerdir.
                        Ürünleri ayırırken, ürünlerin özelliklerini ve kullanıcı isteğini dikkate al.
                        Ürünleri ayırdıktan sonra, ana ürünlerin listesini ve yan ürünlerin listesini ayrı ayrı döndürmelisin.
                        Ana ürünler 1 taneden fazla olabilir. Liste içinde birden fazla ana ürün varsa, hepsini ana ürün olarak değerlendirebilirsin.
                        Yan ürünler ise ana ürünlerle birlikte kullanılabilecek yardımcı ürünlerdir. Yan ürünlerin listesi, ana ürünlerin listesinden farklı olabilir.
                        Ana ürünlerin listesi için "productList" anahtarını, yan ürünlerin listesi için "helperList" anahtarını kullan.


                        ### UYARI:
                        ürünlerin listesinde ana ürün olmayabilir. ozaman Ana ürün listesine bir ürün koymayabilirsin. gerekiyor ise hepsini yan ürün olarak değerlendirebilirsin

                        ### Kullanıcı İsteği:
                        Kullanıcı isteği : {human_message}

                        ### Çıktı Formatı:

                        Yalnızca aşağıdaki formatta JSON döndür:
                        ***Json
                        {
                            mainproductList:[title: "productTitle1", ...}], //Açıklama : Ana ürünlerin listesi
                            auxiliarymainList:[title: "productTitle1", ...}] //Açıklama : Yan ürünlerin listesi
                        }
                        ---
                        `

        context = context.replace("{productList}", productList.map(product => {
            return `Ürün ismi: ${product.title}` + ` - ` //+ `Ürün id: ${product._id}` +  `Ürün açıklama : ${product.meta}`
        }).join("\n"))
            .replace("{human_message}", search_context)

        console.log("[responseContext] Product context built.")
        resolve(context)
    })
}

module.exports = { seperateContext };

