
const Product = require("../models/Product")
const Services = require("../models/Services")
const Company = require("../models/Company")
class Recommendation {
    constructor(data) {
        this._id = data._id;
        this.type = data.type;
        this.score = data.score || 0;
        this.explanation = data.explanation || "";
        this.products = (data.products || []).map((item) => new Product(item));
        this.services = (data.services || []).map((item) => new Services(item));
        this.companyies = (data.companyid || []).map((item) => new Company(item));
        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
    }

    // 🔹 Getter Metodları
    getId() {
        return this._id;
    }

    getType() {
        return this.type;
    }

    getScore() {
        return this.score;
    }

    getExplanation() {
        return this.explanation;
    }

    getProducts() {
        return this.products.map(item => new Product(item));
    }

    getServiceId() {
        return this.serviceid;
    }

    getCompanyId() {
        return this.companyid;
    }

    getCreatedAt() {
        return this.createdAt;
    }

    getUpdatedAt() {
        return this.updatedAt;
    }

    // 🔹 Setter Metodları
    setType(type) {
        this.type = type;
    }

    setScore(score) {
        this.score = score;
    }

    setExplanation(explanation) {
        this.explanation = explanation;
    }

    setProductId(productid) {
        this.productid = productid;
    }

    setServiceId(serviceid) {
        this.serviceid = serviceid;
    }

    setCompanyId(companyid) {
        this.companyid = companyid;
    }

}

module.exports = Recommendation;