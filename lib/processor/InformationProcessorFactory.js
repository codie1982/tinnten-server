const DefaultProcessor = require("./DefaultInfoProcessor");
const ProductInfoProcessor = require("./ProductInfoProcessor");

class InformationProcessorFactory {
  static getInformationProcessor(type, productid, servicesid) {
    //Vektor aramasını burada bir kere daha çalıştırım score düşük ise soru alanına yöneltebiliriz. 

    //action parametresi ile değil intent parametresi ile ayırım yapalım
    switch (type) {
      case "production_info":
        console.log("productid",productid)
        return new ProductInfoProcessor(productid);
      default:
        return new DefaultProcessor();
    }
  }
}

module.exports = InformationProcessorFactory;