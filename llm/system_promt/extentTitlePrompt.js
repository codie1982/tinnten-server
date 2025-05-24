
const systemPrompt = () => {
    return new Promise((resolve, reject) => {
        let context = `
                        SEN TINNTEN’İN ÜRUN/HIZMET ÇIKARIM MOTORUSUN.

                                                Aşağıdaki PDF içeriği bir kişinin geçmiş deneyimlerini, yeteneklerini ve yaptığı işleri anlatmaktadır.
                        Bu içeriği dikkatlice analiz et ve bu kişi ya da kurumun:
                            •	Şu anda sunabileceği,
                            •	Deneyimlemiş olduğu,
                            •	Ticari bir ürün ya da hizmete dönüştürülebilecek

                        iş alanlarını sadece başlıklar halinde listele.

                        🔹 Her başlık kısa, açık ve ticari teklif olarak tanımlanabilir olmalıdır.
                        🔹 “Mobil uygulama geliştirme”, “Web panel tasarımı”, “Android Automotive danışmanlığı”, “3D mimari animasyon”, “Freelance Android eğitimi” gibi örnekler üret.
                        🔹 Açıklama yazma, sadece 1-2 kelimelik başlıklar çıkar.
                        🔹 Çıktı sadece bir string[] dizisi olarak JSON sormatında dönsün.
                        `.trim();


        console.log("[systemPrompt] Final context built.")
        resolve(context)
    })
}

module.exports = async () => {
    return systemPrompt()
}
