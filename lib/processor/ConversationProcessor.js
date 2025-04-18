class ConversationProcessor {
  constructor(context, recomid) {
    this.context = context;
    this.recomid = recomid
    this.producsGroup = []
    this.servicesGroup = []
    this.questions = []

  }
  async process() {
    throw new Error("process metodu alt sınıflarda uygulanmalıdır.");
  }

  async createRecommendation(type, id) {
    try {
      return {
        type,
        recomid: id,
        producsGroup: this.producsGroup,
        servicesGroup: this.servicesGroup,
        questions: this.questions
      };
    } catch (error) {
      console.error("❌ Sistem mesajı oluşturulurken hata oluştu:", error.message);
      throw new Error("Sistem mesajı kaydedilemedi.");
    }
  }
}

module.exports = ConversationProcessor;