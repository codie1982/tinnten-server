const WebSocket = require("ws");
const Redis = require("ioredis");
let wssInstance = null;

// Redis bağlantısı
const redis = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || "benimGizliSifrem123",
  retryStrategy: (times) => {
    console.log(`[socketManager] Redis bağlantısı yeniden deneniyor (${times}. deneme)`);
    return Math.min(times * 100, 5000);
  },
});

// Redis bağlantı durumunu test et
redis.on("connect", () => {
  console.log("[socketManager] Redis bağlantısı başarılı");
  redis
    .set("tinnten:key", "çalıştı")
    .then(() => {
      return redis.get("tinnten:key");
    })
    .then((value) => {
      console.log("[socketManager] Redis test sonucu:", value);
    })
    .catch((error) => {
      console.error("[socketManager] Redis test hatası:", error.message, error.stack);
    });
});

redis.on("error", (error) => {
  console.error("[socketManager] Redis bağlantı hatası:", error.message, error.stack);
});

// Kullanıcı soketlerini RAM'de tutmak için Map
const userSockets = new Map();

module.exports = {
  initSocket(server) {
    if (!server) {
      console.error("[socketManager] Hata: Server nesnesi eksik! Zaman:", new Date().toISOString());
      throw new Error("Server nesnesi eksik!");
    }
  
    if (wssInstance) {
      console.log("[socketManager] WebSocket server zaten başlatılmış. Mevcut instance döndürülüyor. Zaman:", new Date().toISOString());
      return wssInstance;
    }
  
    try {
      wssInstance = new WebSocket.Server({
        path: "/stream",
        server,
        handleProtocols: (protocols, request) => {
          const token = protocols[0]; // token'ı buradan alıyoruz
          request.token = token;
          return token; // handshake aşamasında döndürmek gerekiyor
        }
      });
  
      console.log("[socketManager] WebSocket server başarıyla başlatıldı: /stream. Zaman:", new Date().toISOString());
    } catch (error) {
      console.error("[socketManager] Hata: WebSocket server başlatılırken hata oluştu:", error.message, error.stack, "Zaman:", new Date().toISOString());
      throw error;
    }
  
    return wssInstance;
  },

  getWSS() {
    if (!wssInstance) {
      console.error("[socketManager] Hata: WebSocket server instance başlatılmamış! Zaman:", new Date().toISOString());
      throw new Error("WebSocket server instance is not initialized!");
    }
    console.log("[socketManager] WebSocket server instance döndürülüyor. Zaman:", new Date().toISOString());
    return wssInstance;
  },

  async setUserSocket(userid, socket) {
    const uid = userid.toString();
    console.log(`[socketManager] Kullanıcı soketi kaydediliyor: ${uid}. Zaman:`, new Date().toISOString());

    try {
      // RAM'e yaz
      userSockets.set(uid, { socket, userid: uid });
      console.log(`[socketManager] RAM'e kullanıcı soketi kaydedildi: ${uid}`);

      // Redis'e yaz
      await redis.hset(`socket:${uid}`, {
        isAuthenticated: false,
        socket_created: Date.now(),
      });
      console.log(`[socketManager] Redis'e kullanıcı soketi yazıldı: ${uid}`);
    } catch (error) {
      console.error("[socketManager] Hata: Kullanıcı soketi kaydedilirken hata:", error.message, error.stack, "UserID:", uid, "Zaman:", new Date().toISOString());
      throw error;
    }
  },

  async updateUserAuth(userid, isAuthenticated) {
    const uid = userid.toString();
    console.log(`[socketManager] Kullanıcı yetkilendirmesi güncelleniyor: ${uid}, isAuthenticated: ${isAuthenticated}. Zaman:`, new Date().toISOString());

    try {
      await redis.hset(`socket:${uid}`, "isAuthenticated", isAuthenticated);
      console.log(`[socketManager] Redis'te kullanıcı yetkilendirmesi güncellendi: ${uid}, isAuthenticated: ${isAuthenticated}`);

      if (wssInstance) {
        wssInstance.clients.forEach((client) => {
          if (client.userid === uid && client.readyState === WebSocket.OPEN) {
            client.isAuthenticated = isAuthenticated;
            console.log(`[socketManager] Kullanıcı soketinde yetkilendirme güncellendi: ${uid}, isAuthenticated: ${isAuthenticated}`);
          }
        });
      }
    } catch (error) {
      console.error("[socketManager] Hata: Kullanıcı yetkilendirmesi güncellenirken hata:", error.message, error.stack, "UserID:", uid, "Zaman:", new Date().toISOString());
      throw error;
    }
  },

  async getUserSocket(userid) {
    const uid = userid.toString();
    console.log(`[socketManager] Kullanıcı soketi sorgulanıyor: ${uid}. Zaman:`, new Date().toISOString());

    try {
      const entry = userSockets.get(uid);
      if (!entry || !entry.socket) {
        console.warn(`[socketManager] Uyarı: Kullanıcı soketi bulunamadı: ${uid}`);
        return null;
      }

      const isAuthenticated = await redis.hget(`socket:${uid}`, "isAuthenticated");
      console.log(`[socketManager] Redis'ten yetkilendirme durumu alındı: ${uid}, isAuthenticated: ${isAuthenticated}`);

      if (isAuthenticated !== "true") {
        console.warn(`[socketManager] Uyarı: Kullanıcı yetkilendirilmemiş: ${uid}`);
        return null;
      }

      console.log(`[socketManager] Kullanıcı soketi bulundu: ${uid}`);
      return entry;
    } catch (error) {
      console.error("[socketManager] Hata: Kullanıcı soketi sorgulanırken hata:", error.message, error.stack, "UserID:", uid, "Zaman:", new Date().toISOString());
      return null;
    }
  },

  async deleteUserSocket(userid) {
    const uid = userid.toString();
    console.log(`[socketManager] Kullanıcı soketi siliniyor: ${uid}. Zaman:`, new Date().toISOString());

    try {
      userSockets.delete(uid);
      console.log(`[socketManager] RAM'den kullanıcı soketi silindi: ${uid}`);

      await redis.del(`socket:${uid}`);
      console.log(`[socketManager] Redis'ten kullanıcı soketi silindi: ${uid}`);

      if (wssInstance) {
        wssInstance.clients.forEach((client) => {
          if (client.userid === uid && client.readyState === WebSocket.OPEN) {
            client.close(1000, "Kullanıcı soketi silindi");
            console.log(`[socketManager] Kullanıcı soketi kapatıldı: ${uid}`);
          }
        });
      }
    } catch (error) {
      console.error("[socketManager] Hata: Kullanıcı soketi silinirken hata:", error.message, error.stack, "UserID:", uid, "Zaman:", new Date().toISOString());
      throw error;
    }
  },
};