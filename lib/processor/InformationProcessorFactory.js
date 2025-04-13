const ProductInfoProcessor = require("./ProductInfoProcessor");
const ServicesInfoProcessor = require("./ServicesInfoProcessor");

const DefaultProcessor = require("./DefaultProcessor");

class InformationProcessorFactory {
  static getInformationProcessor(type, context, productid, servicesid, messageGroupid) {
    //Vektor aramasını burada bir kere daha çalıştırım score düşük ise soru alanına yöneltebiliriz. 

    //action parametresi ile değil intent parametresi ile ayırım yapalım
    switch (type) {
      case "production_info":
        return new ProductInfoProcessor(context, productid, messageGroupid);
      case "services_info":
        return new ServicesInfoProcessor(context,servicesid, messageGroupid);
      default:
        return new DefaultProcessor(context, messageGroupid);
    }
  }
}

module.exports = InformationProcessorFactory;