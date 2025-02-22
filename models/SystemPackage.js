
class SystemPackageModel {
    constructor(data) {
        this._id = data._id;
        this.name = data.name;
        this.title = data.title;
        this.description = data.description || "";
        this.price = data.price || { amount: 0, currency: "USD" };
        this.features = data.features || [];
        this.forCompany = data.forCompany || true;
        this.category = data.category || "free";
        this.package_content_type = data.package_content_type || "standart";
        this.limit = data.limit || {};
        this.duration = data.duration || { unlimited: true, time: 30, interval: "day" };
        this.isRenewable = data.isRenewable || false;
        this.renewalPrice = data.renewalPrice || null;
        this.discount = data.discount || 0;
        this.sales_channel = data.sales_channel || "";
        this.default_package = data.default_package || false;
        this.delete = data.delete || false;
        this.status = data.status || "active";
        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
    }

    // 🔹 Getter Metodları
    getId() {
        return this._id;
    }

    getName() {
        return this.name;
    }

    getTitle() {
        return this.title;
    }

    getDescription() {
        return this.description;
    }

    getPrice() {
        return this.price;
    }

    getFeatures() {
        return this.features;
    }

    isForCompany() {
        return this.forCompany;
    }

    getCategory() {
        return this.category;
    }

    getPackageContentType() {
        return this.package_content_type;
    }

    getLimit() {
        return this.limit;
    }

    getDuration() {
        return this.duration;
    }

    isRenewablePackage() {
        return this.isRenewable;
    }

    getRenewalPrice() {
        return this.renewalPrice;
    }

    getDiscount() {
        return this.discount;
    }

    getSalesChannel() {
        return this.sales_channel;
    }

    isDefaultPackage() {
        return this.default_package;
    }

    isDeleted() {
        return this.delete;
    }

    getStatus() {
        return this.status;
    }

    getCreatedAt() {
        return this.createdAt;
    }

    getUpdatedAt() {
        return this.updatedAt;
    }

    // 🔹 Setter Metodları
    setName(name) {
        this.name = name;
    }

    setTitle(title) {
        this.title = title;
    }

    setDescription(description) {
        this.description = description;
    }

    setPrice(price) {
        this.price = price;
    }

    setFeatures(features) {
        this.features = features;
    }

    setForCompany(forCompany) {
        this.forCompany = forCompany;
    }

    setCategory(category) {
        this.category = category;
    }

    setPackageContentType(package_content_type) {
        this.package_content_type = package_content_type;
    }

    setLimit(limit) {
        this.limit = limit;
    }

    setDuration(duration) {
        this.duration = duration;
    }

    setIsRenewable(isRenewable) {
        this.isRenewable = isRenewable;
    }

    setRenewalPrice(renewalPrice) {
        this.renewalPrice = renewalPrice;
    }

    setDiscount(discount) {
        this.discount = discount;
    }

    setSalesChannel(sales_channel) {
        this.sales_channel = sales_channel;
    }

    setDefaultPackage(default_package) {
        this.default_package = default_package;
    }

    setDelete(deleteStatus) {
        this.delete = deleteStatus;
    }

    setStatus(status) {
        this.status = status;
    }

}

module.exports = SystemPackageModel;