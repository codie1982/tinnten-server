class AccountManager {
  constructor(account, packagesMap) {
    this.account = account;
    this.packagesMap = packagesMap; // { packageid: systemPackageObject }
    this.totalLimits = this._calculateTotalLimits();
  }

  _calculateTotalLimits() {
    const total = {};
    const now = new Date();

    console.log("🧮 Başlatılıyor: Aktif paketlerden limit hesaplanıyor...");

    for (const pkg of this.account.packages) {
      const packageId = pkg.packageid.toString();

      // Paket geçerli mi?
      if (!pkg.isActive) {
        console.log(`⛔ Paket ${packageId} pasif, atlanıyor.`);
        continue;
      }

      if (pkg.expiredAt && new Date(pkg.expiredAt) < now) {
        console.log(`⏳ Paket ${packageId} süresi geçmiş (${pkg.expiredAt}), atlanıyor.`);
        continue;
      }

      const sysPkg = this.packagesMap[packageId];
      if (!sysPkg?.limit) {
        console.log(`⚠️ Paket ${packageId} için limit verisi bulunamadı, atlanıyor.`);
        continue;
      }

      console.log(`📦 Paket işleniyor: ${sysPkg.title || packageId}`);

      for (const [section, limits] of Object.entries(sysPkg.limit)) {
        if (!total[section]) total[section] = {};

        console.log(`  🔹 Bölüm: ${section}`);

        for (const [key, val] of Object.entries(limits)) {
          if (val === null || val === undefined) {
            console.log(`    ⚠️ '${section}.${key}' null/undefined, atlanıyor.`);
            continue;
          }

          const valueType = typeof val;

          if (valueType === 'number') {
            if (total[section].hasOwnProperty(key)) {
              console.log(`    ➕ '${section}.${key}': ${total[section][key]} + ${val}`);
              total[section][key] += val;
            } else {
              console.log(`    🆕 '${section}.${key}' ilk kez eklendi: ${val}`);
              total[section][key] = val;
            }
          } else {
            if (!total[section].hasOwnProperty(key)) {
              console.log(`    🏷️ '${section}.${key}' (tip: ${valueType}) ilk kez eklendi: '${val}'`);
              total[section][key] = val;
            } else {
              console.log(`    🔁 '${section}.${key}' (tip: ${valueType}) zaten tanımlı, override edilmedi.`);
            }
          }
        }
      }
    }

    //console.log("✅ Hesaplanan Toplam Limitler:", JSON.stringify(total, null, 2));
    return total;
  }

  _getUsage(section, key) {
    return this.account.usage?.[section]?.[key] || 0;
  }

  // 🔽 Örnek fonksiyonlar
  hasAddProductQuota() {
    const limit = this.totalLimits?.product?.amount || 0;
    const used = this._getUsage("product", "amount");
    return used <= limit;
  }

  hasAddServicesQuota() {
    const limit = this.totalLimits?.services?.amount || 0;
    const used = this._getUsage("services", "amount");
    return used <= limit;
  }
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
  hasFileMaxFileQuota() {
    const limit = this.totalLimits?.file?.maxfileupload || 0;
    const used = this._getUsage("file", "maxfileupload");
    return used <= limit;
  }
  hasImageMaxFileQuota(amount) {
    const limit = this.totalLimits?.image?.maxfileupload || 0;
    const used = this._getUsage("image", "maxfileupload");
    console.log("limit : ", limit, "used : ", used, "condition : ", (used <= limit))
    return used <= limit;
  }

  hasVideoMaxFileQuota() {
    const limit = this.totalLimits?.video?.maxfileupload || 0;
    const used = this._getUsage("video", "maxfileupload");
    return used <= limit;
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
    return this.account.usage
  }
}


module.exports = AccountManager