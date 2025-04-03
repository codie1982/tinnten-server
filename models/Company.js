class CompanyModel {
    constructor(data) {
        this._id = data._id;
        this.userid = data.userid || null;
        this.companyName = data.companyName || "";
        this.foundedDate = data.foundedDate || new Date();
        this.description = data.description || "";
        this.logo = data.logo || null;
        this.industry = data.industry || "";
        this.website = data.website || "";
        this.email = data.email || "";
        this.phone = data.phone || [];
        this.address = data.address || [];
        this.social = data.social || [];
        this.accounts = data.accounts || [];
        this.employees = data.employees || [];
        this.certifications = data.certifications || [];
        this.products = data.products || [];
        this.services = data.services || [];
        this.documents = data.documents || [];
        this.galleries = data.galleries || [];
        this.contents = data.contents || [];
        this.companyType = data.companyType || "individual";
        this.taxOrIdentityNumber = data.taxOrIdentityNumber || "";
        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
    }

    // 🔹 Getter Metodları
    getId() {
        return this._id;
    }

    getUserId() {
        return this.userid;
    }

    getCompanyName() {
        return this.companyName;
    }

    getFoundedDate() {
        return this.foundedDate;
    }

    getDescription() {
        return this.description;
    }

    getLogo() {
        return this.logo;
    }

    getIndustry() {
        return this.industry;
    }

    getWebsite() {
        return this.website;
    }

    getEmail() {
        return this.email;
    }

    getPhone() {
        return this.phone;
    }

    getAddress() {
        return this.address;
    }

    getSocial() {
        return this.social;
    }

    getAccounts() {
        return this.accounts;
    }

    getEmployees() {
        return this.employees;
    }

    getCertifications() {
        return this.certifications;
    }

    getProducts() {
        return this.products;
    }

    getServices() {
        return this.services;
    }

    getDocuments() {
        return this.documents;
    }

    getGalleries() {
        return this.galleries;
    }

    getContents() {
        return this.contents;
    }

    getCompanyType() {
        return this.companyType;
    }

    getTaxOrIdentityNumber() {
        return this.taxOrIdentityNumber;
    }

    getCreatedAt() {
        return this.createdAt;
    }

    getUpdatedAt() {
        return this.updatedAt;
    }

    setCompanyId(id) {
        this._id = id
    }
    // 🔹 Setter Metodları
    setUserId(userid) {
        this.userid = userid;
    }

    setCompanyName(companyName) {
        this.companyName = companyName;
    }

    setFoundedDate(foundedDate) {
        this.foundedDate = foundedDate;
    }

    setDescription(description) {
        this.description = description;
    }

    setLogo(logo) {
        this.logo = logo;
    }

    setIndustry(industry) {
        this.industry = industry;
    }

    setWebsite(website) {
        this.website = website;
    }

    setEmail(email) {
        this.email = email;
    }

    setPhone(phone) {
        this.phone = phone;
    }

    setAddress(address) {
        this.address = address;
    }

    setSocial(social) {
        this.social = social;
    }

    setAccounts(accounts) {
        this.accounts = accounts;
    }

    setEmployees(employees) {
        this.employees = employees;
    }

    setCertifications(certifications) {
        this.certifications = certifications;
    }

    setProducts(products) {
        this.products = products;
    }

    setServices(services) {
        this.services = services;
    }

    setDocuments(documents) {
        this.documents = documents;
    }

    setGalleries(galleries) {
        this.galleries = galleries;
    }

    setContents(contents) {
        this.contents = contents;
    }

    setCompanyType(companyType) {
        this.companyType = companyType;
    }

    setTaxOrIdentityNumber(taxOrIdentityNumber) {
        this.taxOrIdentityNumber = taxOrIdentityNumber;
    }
}

module.exports = CompanyModel;