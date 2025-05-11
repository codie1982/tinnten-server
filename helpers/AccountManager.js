class AccountManager {
    constructor(account, packagesMap) {
      this.account = account;
      this.packagesMap = packagesMap; // { packageid: systemPackageObject }
      this.totalLimits = this._calculateTotalLimits();
    }
  
    _calculateTotalLimits() {
      const total = {};
      const now = new Date();
  
      for (const pkg of this.account.packages) {
        if (!pkg.isActive || (pkg.expiredAt && new Date(pkg.expiredAt) < now)) continue;
  
        const sysPkg = this.packagesMap[pkg.packageid.toString()];
        if (!sysPkg || !sysPkg.limit) continue;
  
        for (const [section, limits] of Object.entries(sysPkg.limit)) {
          if (!total[section]) total[section] = {};
          for (const [key, val] of Object.entries(limits)) {
            if (typeof val === 'number') {
              total[section][key] = (total[section][key] || 0) + val;
            }
          }
        }
      }
      return total;
    }
  
    _getUsage(section, key) {
      return this.account.usage?.[section]?.[key] || 0;
    }
  
    // 🔽 Örnek fonksiyonlar
  
    hasFileUploadQuota(amount) {
      const limit = this.totalLimits?.file?.upload || 0;
      const used = this._getUsage("file", "upload");
      return used + amount <= limit;
    }
  
    hasFileDownloadQuota(amount) {
      const limit = this.totalLimits?.file?.download || 0;
      const used = this._getUsage("file", "download");
      return used + amount <= limit;
    }
  
    hasImageUploadQuota(amount) {
      const limit = this.totalLimits?.image?.upload || 0;
      const used = this._getUsage("image", "upload");
      return used + amount <= limit;
    }
  
    hasVideoUploadQuota(amount) {
      const limit = this.totalLimits?.video?.upload || 0;
      const used = this._getUsage("video", "upload");
      return used + amount <= limit;
    }
  
    hasOfferGenerationQuota(amount = 1) {
      const limit = this.totalLimits?.offer?.max || 0;
      const used = this._getUsage("offer", "count");
      return used + amount <= limit;
    }
  
    hasLLMTokenQuota(amount) {
      const limit = this.totalLimits?.llm?.token || 0;
      const used = this._getUsage("llm", "token");
      return used + amount <= limit;
    }
  
    // 🔁 Kullanım arttırma fonksiyonu (isteğe bağlı)
    incrementUsage(section, key, amount) {
      if (!this.account.usage[section]) this.account.usage[section] = {};
      if (!this.account.usage[section][key]) this.account.usage[section][key] = 0;
      this.account.usage[section][key] += amount;
      this.account.usage[section].lastReset = new Date();
    }
  }