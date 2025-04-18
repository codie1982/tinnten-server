class InformationProcessor {
  constructor(productid, servicesid) {
    this.productid = productid;
    this.servicesid = servicesid;
  }
  
  async process() {
    throw new Error("process metodu alt sınıflarda uygulanmalıdır.");
  }
  async setInformation(info) {
    try {
      return info;
    } catch (error) {
      console.error("❌ Sistem mesajı oluşturulurken hata oluştu:", error.message);
      throw new Error("Sistem mesajı kaydedilemedi.");
    }
  }
}

module.exports = InformationProcessor;