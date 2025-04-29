// 📦 RedisDBManager.js - Redis üzerinden veri yönetimini kolaylaştıran base class
const Redis = require("ioredis");

class RedisDBManager {
  constructor(prefix = "", redisConfig = null) {
    this.prefix = prefix;

    // Eğer redisConfig verilmemişse, .env'den al
    if (!redisConfig) {
      redisConfig = {
        host: process.env.REDIS_HOST || "127.0.0.1",
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD, // 🔐 şifre burada
      };
    }
    this.redis = new Redis(redisConfig);

    // Redis bağlantı hatalarını dinle
    this.redis.on("error", (err) => {
      console.error("[RedisDBManager] Redis bağlantı hatası:", err);
    });

    // Bağlantı başarılı olduğunda
    this.redis.on("connect", () => {
      console.log("[RedisDBManager] Redis bağlantısı başarılı.");
    });
  }

  getKey(userid, subkey) {
    if (!userid || !subkey) {
      throw new Error("[RedisDBManager] userid ve subkey zorunludur.");
    }
    const key = `${this.prefix}:${userid}:${subkey}`;
    console.log(`[RedisDBManager] Anahtar oluşturuldu: ${key}`);
    return key;
  }

  async set(userid, subkey, data, ttl = 3600) {
    try {
      if (data === null || data === undefined) {
        throw new Error("[RedisDBManager] Veri null veya undefined olamaz.");
      }
      const key = this.getKey(userid, subkey);
      console.log(`[RedisDBManager] SET: ${key}, TTL: ${ttl}`);
      await this.redis.set(key, JSON.stringify(data), "EX", ttl);
    } catch (err) {
      console.error(`[RedisDBManager] SET hatası: ${key}`, err);
      throw err;
    }
  }

  async get(userid, subkey) {
    try {
      const key = this.getKey(userid, subkey);
      console.log(`[RedisDBManager] GET: ${key}`);
      const raw = await this.redis.get(key);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.error(`[RedisDBManager] GET hatası: ${key}`, err);
      throw err;
    }
  }

  async update(userid, subkey, updateObj) {
    try {
      if (!updateObj || typeof updateObj !== "object") {
        throw new Error("[RedisDBManager] updateObj bir obje olmalıdır.");
      }
      const key = this.getKey(userid, subkey);
      console.log(`[RedisDBManager] UPDATE: ${key}`);
      const current = await this.get(userid, subkey);
      if (!current) {
        console.warn(`[RedisDBManager] UPDATE FAILED - Veri yok: ${key}`);
        return null;
      }
      const updated = { ...current, ...updateObj };
      await this.set(userid, subkey, updated);
      return updated;
    } catch (err) {
      console.error(`[RedisDBManager] UPDATE hatası: ${key}`, err);
      throw err;
    }
  }

  async delete(userid, subkey) {
    try {
      const key = this.getKey(userid, subkey);
      console.log(`[RedisDBManager] DELETE: ${key}`);
      await this.redis.del(key);
    } catch (err) {
      console.error(`[RedisDBManager] DELETE hatası: ${key}`, err);
      throw err;
    }
  }

  // Redis bağlantısını kapat
  async disconnect() {
    try {
      await this.redis.quit();
      console.log("[RedisDBManager] Redis bağlantısı kapatıldı.");
    } catch (err) {
      console.error("[RedisDBManager] Bağlantı kapatma hatası:", err);
    }
  }
}

module.exports = RedisDBManager;