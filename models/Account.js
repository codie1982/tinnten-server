const SystemPackage = require("../models/SystemPackage")
class Account {
    constructor(data) {
        this._id = data._id;
        this.userid = data.userid;
        this.packages = (data.packages || []).map(item => new SystemPackage(item));
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

    getPackages() {
        return this.packages;
    }

    getCreatedAt() {
        return this.createdAt;
    }

    getUpdatedAt() {
        return this.updatedAt;
    }

    // 🔹 Setter Metodları
    setUserId(userid) {
        this.userid = userid;
    }

    setPackages(packages) {
        this.packages = packages;
    }

    addPackage(packageid) {
        this.packages.push({
            packageid,
            isActive: true,
            createdAt: new Date()
        });
    }

    deactivatePackage(packageid) {
        const packageIndex = this.packages.findIndex(pkg => pkg.packageid.toString() === packageid.toString());
        if (packageIndex !== -1) {
            this.packages[packageIndex].isActive = false;
        }
    }
}

module.exports = Account;