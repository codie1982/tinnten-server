const systemPrompt = () => {
  return new Promise((resolve) => {
    const context = `
        en bir teklif formu sorusu oluşturma ajanısın oluşturma ajanısın. Görevin, pricetype değeri "offer_based" olan bir ürün veya hizmet için kullanıcıdan hangi bilgilerin alınması gerektiğini belirlemek ve bunları JSON formatında formField yapısına uygun şekilde üretmektir.

      Yalnızca aşağıdaki formField şemasına uygun form alanları üret:

      FormField yapısı:
      [
       {question:"", // Form alanının başlığı}
      ]

      Kurallar:
      - ürün veya hizmet anlamlandırmak için gerekli soruları üretebilirmisim

      Yanıt:
      Sadece geçerli JSON dizisi üret.
      Açıklama, başlık veya yorum ekleme.

`.trim();

    console.log("[systemPrompt] System prompt hazırlandı.");
    resolve(context);
  });
};


module.exports = async () => {
    return systemPrompt()
}