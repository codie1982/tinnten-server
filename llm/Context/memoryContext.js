const memoryContext = async (memory) => {

    return `
    Sen bir yardımcı asistansın. Kullanıcı ile olan önceki konuşmaların bir özetini çıkarmalısın.
    
    **Kullanıcı Bilgileri**
    - Kullanıcı ID: ${this.userId}
    
    **Son Mesajlar:**
    ${memory.messages.map(m => `- ${m.content}`).join("\n")}
    
    **Önerilen Ürünler:**
    ${memory.recommendations.filter(r => r.productid).map(r => `- ${r.productid.title} (Skor: ${r.score})`).join("\n")}
    
    **Önerilen Hizmetler:**
    ${memory.recommendations.filter(r => r.serviceid).map(r => `- ${r.serviceid.name} (Skor: ${r.score})`).join("\n")}
    
    **Önerilen Şirketler:**
    ${memory.recommendations.filter(r => r.companyid).map(r => `- ${r.companyid.companyName} (Skor: ${r.score})`).join("\n")}
    `
}

module.exports = async (memory) => {
    return memoryContext(memory)
}

