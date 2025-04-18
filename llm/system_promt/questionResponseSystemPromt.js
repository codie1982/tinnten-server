
const Conversation = require("../../models/Conversation.js")
const ConversationDB = require("../../db/ConversationMongoDB.js")

/**
 * 
 {
        "_id": "680109fab18f27780eeaaed4",
        "questionText": "Hangi alanda bir şeyler arıyorsunuz? Örneğin, teknoloji, moda, kitaplar veya başka bir şey mi?",
        "important": "high",
        "input_type": "select",
        "options": [
          "Teknoloji",
          "Moda",
          "Kitaplar",
          "Diğer"
        ],
        "createdAt": "2025-04-17T14:02:34.395Z",
        "updatedAt": "2025-04-17T14:02:34.395Z",
        "__v": 0
      },
 */
const responseContext = (user, userid, questions = []) => {
    return new Promise((resolve, reject) => {
        console.log("questions", JSON.stringify(questions))

        const questionsFormatted = questions.map((q, index) => {
            const optionsBlock = (q.options && q.options.length > 0)
                ? q.options.map(opt => `- ${opt}`).join('\n')
                : '*(Serbest yanıt bekleniyor)*';

            return `### ${index + 1}. ${q.questionText}\n`
                + `**Seçenekler:**\n${optionsBlock}\n`;
        }).join('\n');

        const context = `🧠 Sen bir **Soru Yöneltme Uzmanı** olarak görev yapıyorsun.  
                    Aşağıdaki kullanıcı mesajına uygun olarak, kullanıcıya **netleştirici sorular** soracaksın.
                    
                    ### Çıktı Kuralları:
                    1. Her soruyu **ayrı bir bölüm** olarak sun.
                    2. Markdown formatını etkin kullan:
                    - Her soruya "###" başlık
                    - Altına **kalın yazı**, *eğik yazı*, "kod bloğu", ve madde işaretleri ("-") gibi görsel öğeler kullan
                    - Her soru bloğunun **arasında boşluk bırak**
                    3. "options" varsa alt alta madde halinde yaz. Yoksa *serbest yanıt bekleniyor* notu düş.
                    4. Dilersen 🟡, 🔵, ❓ gibi simgelerle stilistik öğeler ekle.
                    5. Uzun paragraflar yazma. Her bölüm 3–4 satırdan fazla olmasın.
                    6. Çıktının tamamı yalnızca **Markdown formatında** olsun. Ekstra açıklama verme.

                    ---
                    
                    👤 **Kullanıcı Adı:** ${user.name}
                    
                    📋 **Sormamız gereken sorular:**
                    
                    ${questionsFormatted}
                    
                    ---
                    
                    ⛔ *Kullanıcıya başka açıklama yapma. Sadece bu soruları sırasıyla soracak şekilde sistem mesajı üret.*  
                    *Her soruyu ayrı bir mesaj olarak gösterebilirsin veya tümünü tek bir mesajda sıralayabilirsin.*
                    *Arkadaşca bir dil kullan.*
                    
                    📝 *Yanıtları JSON ile kaydedeceğiz, bu yüzden kullanıcıya input_type’a uygun seçenek sunulmalıdır.*
                    `;

        console.log("[QuestionAgent] Final context built.", context);
        resolve(context);
    });
}

module.exports = async (user, userid, questions) => {
    return responseContext(user, userid, questions)
}