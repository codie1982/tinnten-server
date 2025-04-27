const Redis = require("ioredis");
const redis = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || "benimGizliSifrem123",  // 🔥 burası eklenecek
  retryStrategy: (times) => {
    console.log(`Redis bağlantısı yeniden deneniyor (${times}. deneme)`);
    return Math.min(times * 100, 5000);
  }
});

redis.set("tinnten:key", "çalıştı").then(() => {
  redis.get("tinnten:key").then(value => {
    console.log("Redis test sonucu:", value); // "çalıştı"
  });
});

const userSockets = new Map(); // socket objesi sadece RAM'de tutulur

const socketManager = {
  userSockets,

  async setUserSocket(userid, socket) {
    const uid = userid.toString();

    // 🧠 RAM'e yaz
    userSockets.set(uid, { socket, userid: uid });

    // 🧠 Redis'e yaz
    await redis.hset(`socket:${uid}`, {
      isAuthenticated: false,
      socket_created: Date.now()
    });

    console.log("[SocketManager] setUserSocket → Redis'e yazıldı:", uid);
  },

  async updateUserAuth(userid, isAuthenticated) {
    await redis.hset(`socket:${userid}`, "isAuthenticated", isAuthenticated);
  },

  async getUserSocket(userid) {
    const entry = userSockets.get(userid);
    if (!entry || !entry.socket) return null;

    const isAuthenticated = await redis.hget(`socket:${userid}`, "isAuthenticated");
    console.log("isAuthenticated", isAuthenticated)
    if (isAuthenticated !== "true") return null;

    return entry;
  },

  async deleteUserSocket(userid) {
    userSockets.delete(userid);
    await redis.del(`socket:${userid}`);
  }
};

module.exports = socketManager;