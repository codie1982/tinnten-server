class Product {
    constructor(data) {
        this._id = data._id;
        this.companyid = data.companyid || {};
        this.title = data.title;
        this.meta = data.meta || "";
        this.description = data.description || "";
        this.categories = data.categories || [];
        this.basePrice = data.basePrice || [];
        this.variants = data.variants || [];
        this.gallery = data.gallery || null;
        this.redirectUrl = data.redirectUrl || [];
        this.vector = data.vector || [];
        this.attributes = data.attributes || [];
        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
    }

    // 🔹 Getter Metodları
    getId() {
        return this._id;
    }

    getCompanyId() {
        return this.companyid;
    }

    getTitle() {
        return this.title;
    }

    getMeta() {
        return this.meta;
    }

    getDescription() {
        return this.description;
    }

    getCategories() {
        return this.categories;
    }

    getBasePrice() {
        return this.basePrice;
    }

    getVariants() {
        return this.variants;
    }

    getGallery() {
        return this.gallery;
    }

    getRedirectUrls() {
        return this.redirectUrl;
    }

    getVector() {
        return this.vector;
    }

    getAttributes() {
        return this.attributes;
    }

    getCreatedAt() {
        return this.createdAt;
    }

    getUpdatedAt() {
        return this.updatedAt;
    }

    setProductId(id) {
        console.log("setProductId",id)
        this._id = id;
    }

    // 🔹 Setter Metodları
    setCompanyId(companyid) {
        this.companyid = companyid;
    }

    setTitle(title) {
        this.title = title;
    }

    setMeta(meta) {
        this.meta = meta;
    }

    setDescription(description) {
        this.description = description;
    }

    setCategories(categories) {
        this.categories = categories;
    }

    setBasePrice(basePrice) {
        this.basePrice = basePrice;
    }

    setVariants(variants) {
        this.variants = variants;
    }

    setGallery(gallery) {
        this.gallery = gallery;
    }

    setRedirectUrls(redirectUrl) {
        this.redirectUrl = redirectUrl;
    }

    setVector(vector) {
        this.vector = vector;
    }

    setAttributes(attributes) {
        this.attributes = attributes;
    }

    // 🔹 MongoDB CRUD İşlemleri
}

module.exports = Product;