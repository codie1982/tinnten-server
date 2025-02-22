const summarizeContext = async (conversation) => {

    return `
    Sen bir yardımcı asistansın. Kullanıcı ile olan önceki konuşmaların bir özetini çıkarmalısın.
    
    **Son Mesajlar:**
    ${conversation.messages.map(m => `- ${m.content}`).join("\n")}
    
     **Ürinler için sorulan sorular ve cevaplaro:**
    ${conversation.messages
            ?.map((item) => {
                return item?.productionQuestions?.map((quest) =>
                    `Soru: ${quest?.questionText || "Bilinmiyor"}\nCevap: ${quest?.answer || "Bilinmiyor"}\n`
                ).join('') || '';  // Eğer boşsa, en azından boş string dön
            }).join('')}

    ** Önerilen Ürünler:**
    ${conversation?.recommendations?.filter(r => r.productid).map(r => `- ${r.productid.title} (Skor: ${r.score})`).join("\n")}
    
    ** Önerilen Hizmetler:**
    ${conversation?.recommendations?.filter(r => r.serviceid).map(r => `- ${r.serviceid.name} (Skor: ${r.score})`).join("\n")}
    
    ** Önerilen Şirketler:**
    ${conversation?.recommendations?.filter(r => r.companyid).map(r => `- ${r.companyid.companyName} (Skor: ${r.score})`).join("\n")}
`
}

module.exports = async (conversation) => {
    return summarizeContext(conversation)
}

