const summarizeContext = async (conversation) => {
    console.log("summarizeContext - conversation")
    return `
    Sen bir yardımcı asistansın. Kullanıcı ile olan önceki konuşmaların bir özetini çıkarmalısın.
    
    **Son Mesajlar:**
    ${conversation.messages.map(m => `- ${m.content}`).join("\n")}
    
     **Ürünler için sorulan sorular ve cevapları:**
    ${conversation.messages
            ?.map((item) => {
                return item?.productionQuestions?.map((quest) =>
                    `Soru: ${quest?.questionText || "Bilinmiyor"}\n}\n`
                ).join('') || '';  // Eğer boşsa, en azından boş string dön
            }).join('')}

    ** Önerilen Ürünler:**
    ${conversation.messages
            ?.map((item) => {
                return item?.recommendations?.map((recom) => {
                    return recom.products.map((product) => `Ürün ismi: ${product?.title}\n`)
                }

                ).join('') || '';  // Eğer boşsa, en azından boş string dön
            }).join('')}
    
    ** Önerilen Hizmetler:**
    ${conversation.messages
            ?.map((item) => {
                return item?.recommendations?.map((recom) => {
                    return recom.services.map((service) => `Ürün ismi: ${service?.name}\n`)
                }

                ).join('') || '';  // Eğer boşsa, en azından boş string dön
            }).join('')}
    
    ** Önerilen Şirketler:**
     ${conversation.messages
            ?.map((item) => {
                return item?.recommendations?.map((recom) => {
                    return recom.companyies.map((company) => `Ürün ismi: ${company?.companyName}\n`)
                }

                ).join('') || '';  // Eğer boşsa, en azından boş string dön
            }).join('')}
`
}

module.exports = async (conversation) => {
    return summarizeContext(conversation)
}

