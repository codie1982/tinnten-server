
class Service {
    constructor(data) {
        this._id = data._id;
        this.companyid = data.companyid || null;
        this.name = data.name;
        this.description = data.description || "";
        this.categories = data.categories || [];
        this.features = data.features || [];
        this.duration = data.duration || "Belirtilmemiş";
        this.price = data.price || null;
        this.gallery = data.gallery || [];
        this.isLocationBased = data.isLocationBased || false;
        this.location = {
            province: data.location?.province || "",
            district: data.location?.district || "",
            coordinates: {
                lat: data.location?.coordinates?.lat || null,
                lng: data.location?.coordinates?.lng || null
            }
        };
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

    getName() {
        return this.name;
    }

    getDescription() {
        return this.description;
    }

    getCategories() {
        return this.categories;
    }

    getFeatures() {
        return this.features;
    }

    getDuration() {
        return this.duration;
    }

    getPrice() {
        return this.price;
    }

    getGallery() {
        return this.gallery;
    }

    isServiceLocationBased() {
        return this.isLocationBased;
    }

    getLocation() {
        return this.location;
    }

    getCreatedAt() {
        return this.createdAt;
    }

    getUpdatedAt() {
        return this.updatedAt;
    }

    // 🔹 Setter Metodları
    setCompanyId(companyid) {
        this.companyid = companyid;
    }

    setName(name) {
        this.name = name;
    }

    setDescription(description) {
        this.description = description;
    }

    setCategories(categories) {
        this.categories = categories;
    }

    setFeatures(features) {
        this.features = features;
    }

    setDuration(duration) {
        this.duration = duration;
    }

    setPrice(price) {
        this.price = price;
    }

    setGallery(gallery) {
        this.gallery = gallery;
    }

    setIsLocationBased(isLocationBased) {
        this.isLocationBased = isLocationBased;
    }

    setLocation(province, district, lat, lng) {
        this.location = {
            province,
            district,
            coordinates: { lat, lng }
        };
    }
}

module.exports = Service;