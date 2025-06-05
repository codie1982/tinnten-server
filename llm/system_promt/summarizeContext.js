const summarizeContext = async (messages) => {
    console.log("summarizeContext - conversation")
    return `
    Sen bir yardımcı asistansın. Kullanıcı ile olan önceki konuşmaların bir özetini çıkarmalısın.
    
    **Son Mesajlar:**
    ${messages.map(m => `- ${m}`).join("\n")}
    
    `.trim()
}

module.exports = async (messages) => {
    return summarizeContext(messages)
}



/*
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
                    return recom.products.main.map((product) => `Ürün ismi: ${product?.title}\n`)
                }

                ).join('') || '';  // Eğer boşsa, en azından boş string dön
            }).join('')}
*/