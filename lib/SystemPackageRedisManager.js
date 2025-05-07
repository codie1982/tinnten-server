// 📂 SystemPackageRedisManager.js - RedisDBManager'dan türeyen Redis-tabanlı konuşma yönetimi
const RedisDB = require("./RedisDB");
const key = "packages:system"

class SystemPackageRedisManager extends RedisDB {
  constructor(redisConfig) {
    super("systempackages", redisConfig);
  }


  async setPackages(data, ttl = 3600) {
    try {
      if (!data || typeof data !== "object") {
        throw new Error("[SystemPackageRedisManager] data zorunludur.");
      }
      console.log(`[SystemPackageRedisManager] packages: ${data}`);
      return await this.set(null, `${key}`, data, ttl);
    } catch (err) {
      console.error(`[SystemPackageRedisManager] data hatası: ${data}`, err);
      throw err;
    }
  }

  async isExist() {
    try {
      console.log(`[SystemPackageRedisManager] System-packages`);
      let base = await this.get(null, `${key}`)
      return base ? true : false;
    } catch (err) {
      console.error(`[SystemPackageRedisManager] packages`, err);
      throw err;
    }
  }

  async getPackages() {
    try {
      console.log(`[SystemPackageRedisManager] packages`);
      return await this.get(null, `${key}`);
    } catch (err) {
      console.error(`[SystemPackageRedisManager] data hatası`, err);
      throw err;
    }
  }

  async deleteAll() {
    try {
      console.log(`[SystemPackageRedisManager] deleteAll`);
      await Promise.all([
        this.delete(null, `${key}`),
      ]);
    } catch (err) {
      console.error(`[SystemPackageRedisManager] deleteAll hatası}`, err);
      throw err;
    }
  }
}

module.exports = SystemPackageRedisManager;
