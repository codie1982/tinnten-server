const orientationContext = async (messages, userbehavior, userContext) => {

    let productQuestionList =[]
    let servicesQuestionList =[]
    let recommendationProductList =[]
    let recommendationServicesList =[]

    const summarize = messages.join(' '); // Assuming messages is an array of strings
    const qna = questionList.map(q => ({ q: q.question, a: q.answer })); // Assuming questionList is an array of objects with question and answer properties
    const human_message = messages[messages.length - 1]; // Assuming the last message is the human message
    qna ? qna.map(q => `Soru : ${q.q}\nCevap : ${q.a}\n`).join('') : ""


    
    let context = `
    Sen bir yardımcı assistansın.  
    Kullanıcı ile olan önceki konuşmaların bir özetini çıkarmalısın.  
    
    
    ---
    Kullanıcının Tinnten den genel beklentisi: {userContext} 
    Kullanıcı Davranışı: {user_behavior}  
    Soru Cevap: {conversation_questions}  
    Ürün Listesi: {product_list}
    Hizmet Listesi: {services_list}
    `;

    return context
       
        .replace("{conversation_questions}",)
        .replace("{userContext}", userContext)
        .replace("{user_behavior}", userbehavior)
        .replace("{product_list}", productList.join(', '))
        .replace("{services_list}", servicesList.join(', '));
}

module.exports = async (messages, userbehavior, userContext) => {
    return orientationContext(messages, userbehavior, userContext)
}

