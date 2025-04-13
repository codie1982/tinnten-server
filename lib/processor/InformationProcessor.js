class InformationProcessor {
  constructor(product, services, messageid) {
    this.product = product;
    this.services = services;
    this.messageid = messageid;
  }
  async process() {
    throw new Error("process metodu alt sınıflarda uygulanmalıdır.");
  }
  async setInformationText(informationText) {
    try {
      return informationText;
    } catch (error) {
      console.error("❌ Sistem mesajı oluşturulurken hata oluştu:", error.message);
      throw new Error("Sistem mesajı kaydedilemedi.");
    }
  }
}

module.exports = InformationProcessor;