// 📂 ConversationManager.js - RedisDBManager'dan türeyen Redis-tabanlı konuşma yönetimi
const RedisDB = require("./RedisDB");

/**
 * conversation:{userid}:{conversationid}:*	Konuşma parçaları (base, messages, memory, vs.)
    message:{messageid}	Tekil mesaj
    recommendation:{recomid}	Öneri bloğu
    product:{productid}	Ürün
    price:{priceid}	Fiyat
    variant:{variantid}	Ürün varyantı
    gallery:{galleryid}	Galeri
    image:{imageid}	Görsel
    service:{serviceid}	Hizmet
    company:{companyid}	Firma
    user:*	Kullanıcıya özel bilgiler (history, session, behavior)
 */
/**
 * const conversationSchema = new mongoose.Schema({
   conversationid: { type: String, unique: true },                   // Konuşma için benzersiz UUID
   userid: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
   title: { type: String, default: "", required: false },
   messages: [
     { type: mongoose.Schema.Types.ObjectId, ref: "message", required: true, default: [] }
   ],                                                        // Mesajlar                                                 // Kullanıcı davranışları
   status: { type: String, enum: ["active", "completed"], default: "active" },
   delete: { type: Boolean, default: false }
   // Konuşma durumu
 }, { timestamps: true });
 */

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_MESSAGES = 200; // Redis'te tutulacak maksimum mesaj adedi
const MAX_MESSAGE_SIZE_KB = 100;
class ConversationManager extends RedisDB {

  constructor(redisConfig) {
    super("conversation", redisConfig);
  }


  async setConversation(userid, conversationid, conversation, ttl = 3600) {
    const {
      title,
      summary,
      status,
      createdAt,
      updatedAt,
      messages,
      delete: isDeleted,
    } = conversation;

    const pipeline = this.redis.pipeline();

    // Base metadata
    pipeline.set(
      this.getKey(userid, `base:${conversationid}`),
      JSON.stringify({
        title: title || "",
        status,
        createdAt,
        updatedAt,
        delete: isDeleted,
      }),
      "EX",
      ttl
    );

    // Summary
    pipeline.set(
      this.getKey(userid, `summary:${conversationid}`),
      JSON.stringify({ summary: summary || "Özet yok" }),
      "EX",
      ttl
    );
    // message
    pipeline.set(
      this.getKey(userid, `messages:${conversationid}`),
      JSON.stringify(messages || []),
      "EX",
      ttl
    );
    await pipeline.exec();
    console.log(`[ConversationRedisManager] Konuşma ${conversationid} Redis'e kaydedildi.`);
  }

  async getConversation(userid, conversationid, page = 1, limit = 10) {
    console.log(`[ConversationRedisManager] getConversation.`, userid, conversationid);
    //const base = await this.get(userid, `base:${conversationid}`)

    const [base, summary, messages] = await Promise.all([
      this.getBase(userid, conversationid),
      this.getSummary(userid, conversationid),
      this.getMessages(userid, conversationid, page, limit),
    ]);
    return {
      base, summary, messages
    };
  }


  async setBase(userid, conversationid, baseData, ttl = 3600) {
    try {
      if (!conversationid || !baseData || typeof baseData !== "object") {
        throw new Error("[ConversationManager] conversationid ve baseData zorunludur.");
      }
      console.log(`[ConversationManager] setBase: ${userid} - ${conversationid}`);
      return await this.set(userid, `base:${conversationid}`, baseData, ttl);
    } catch (err) {
      console.error(`[ConversationManager] setBase hatası: ${userid} - ${conversationid}`, err);
      throw err;
    }
  }

  async isExist(userid, conversationid) {
    try {
      console.log(`[ConversationManager] getBase: ${userid} - ${conversationid}`);
      let base = await this.get(userid, `base:${conversationid}`)
      return base ? true : false;
    } catch (err) {
      console.error(`[ConversationManager] getBase hatası: ${userid} - ${conversationid}`, err);
      throw err;
    }
  }

  async getBase(userid, conversationid) {
    try {
      //console.log(`[ConversationManager] getBase: ${userid} - ${conversationid}`);
      return await this.get(userid, `base:${conversationid}`);
    } catch (err) {
      console.error(`[ConversationManager] getBase hatası: ${userid} - ${conversationid}`, err);
      throw err;
    }
  }

  async setMessages(userid, conversationid, message, ttl = 3600) {
    try {
      const key = `messages:${conversationid}`;
      const payload = Array.isArray(message) ? JSON.stringify(messages) : "{}";
      if (!userid || !conversationid || !key || !payload) {
        throw new Error("[ConversationManager] userid, conversationid, key ve payload zorunludur.");
      }
      console.log(`[ConversationManager] setMessages -> key: ${key} | ttl: ${ttl}`);
      return await this.set(userid, key, payload, ttl);
    } catch (err) {
      console.error(`[ConversationManager] setMessages HATASI -> ${userid} - ${conversationid}`, err);
      throw new Error("Redis mesaj yazım hatası");
    }
  }

  async setMessage(userid, conversationid, message, ttl = 3600, maxMessages = 10) {
    try {
      if (!userid || !conversationid || !message?.messageid) {
        throw new Error("[setMessage] userid, conversationid ve message.messageid zorunludur.");
      }

      const messageKey = `messages:${conversationid}:message:${message.messageid}`;
      const payload = JSON.stringify(message);

      // 1. Mesajı Redis'e yaz
      await this.set(userid, messageKey, payload, ttl);

      // 2. Mesaj anahtarlarını tara
      const pattern = `${this.prefix}:${userid}:messages:${conversationid}:message:*`;
      const stream = this.redis.scanStream({ match: pattern, count: 100 });

      const keys = [];
      for await (const part of stream) {
        keys.push(...part);
      }

      if (keys.length > maxMessages) {
        // 3. Tüm mesajları oku
        const pipeline = this.redis.pipeline();
        keys.forEach(k => pipeline.get(k));
        const results = await pipeline.exec();

        const messages = results.map(([err, val], i) => {
          if (err || !val) return null;
          try {
            return {
              key: keys[i],
              data: JSON.parse(val)
            };
          } catch (e) {
            return null;
          }
        }).filter(Boolean);

        // 4. En eski mesajları sırala ve sil
        messages.sort((a, b) => new Date(a.data.createdAt) - new Date(b.data.createdAt));

        const extraCount = messages.length - maxMessages;
        const toDelete = messages.slice(0, extraCount);

        for (const msg of toDelete) {
          await this.redis.del(msg.key);
        }
      }

      return true;
    } catch (err) {
      console.error(`[ConversationManager] setMessage HATASI: ${userid} - ${conversationid}`, err);
      throw new Error("Redis mesaj setleme hatası");
    }
  }


  async updateMessage(userid, conversationid, messageid, updatedMessage, ttl = 3600) {
    try {
      const key = `messages:${conversationid}:message:${messageid}`;
      const raw = await this.get(userid, key);

      if (!raw) {
        console.warn(`[updateMessage] Redis'te mesaj bulunamadı: ${key}, yeni kayıt yapılacak.`);
      }

      let existingMessage = {};
      try {
        existingMessage = raw ? JSON.parse(raw) : {};
      } catch (parseErr) {
        console.error(`[updateMessage] JSON parse hatası -> key: ${key}`, parseErr);
        // parse edilemeyen veri üzerine yazılsın
      }

      const mergedMessage = {
        ...existingMessage,
        ...updatedMessage,
        messageid: messageid // garantiye al
      };

      await this.set(userid, key, JSON.stringify(mergedMessage), ttl);

      console.log(`[updateMessage] Güncellendi: ${key}`);
      return mergedMessage;

    } catch (err) {
      console.error(`[ConversationManager] updateMessage HATASI: ${userid} - ${conversationid} - ${messageid}`, err);
      throw new Error("Mesaj güncellenirken hata oluştu");
    }
  }

  async getMessages(userid, conversationid, limit = 10) {
    try {
      const scanPattern = `${this.prefix}:${userid}:messages:${conversationid}:message:*`;

      const stream = this.redis.scanStream({
        match: scanPattern,
        count: 100,
      });

      const keys = [];

      for await (const resultKeys of stream) {
        keys.push(...resultKeys);
      }

      if (keys.length === 0) return [];

      const pipeline = this.redis.pipeline();
      keys.forEach((key) => pipeline.get(key));
      const results = await pipeline.exec();

      const messages = results
        .map(([err, raw]) => {
          if (err || !raw) return null;
          try {
            return JSON.parse(raw);
          } catch (e) {
            return null;
          }
        })
        .filter(Boolean)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); // sırala

      return messages.slice(-limit); // sadece son limit kadar mesaj
    } catch (err) {
      console.error(`[ConversationManager] getMessages HATASI`, err);
      throw new Error("Redis mesaj okuma hatası");
    }
  }

  async setSummary(userid, conversationid, summary, ttl = 3600) {
    try {
      if (!summary || typeof summary !== "object") {
        throw new Error("[ConversationManager] summary bir obje olmalıdır.");
      }
      console.log(`[ConversationManager] setSummary: ${userid} - ${conversationid}`);
      return await this.set(userid, `summary:${conversationid}`, summary.summary, ttl);
    } catch (err) {
      console.error(`[ConversationManager] setSummary hatası: ${userid} - ${conversationid}`, err);
      throw err;
    }
  }

  async getSummary(userid, conversationid) {
    try {
      //console.log(`[ConversationManager] getSummary: ${userid} - ${conversationid}`);
      return await this.get(userid, `summary:${conversationid}`);
    } catch (err) {
      console.error(`[ConversationManager] getSummary hatası: ${userid} - ${conversationid}`, err);
      throw err;
    }
  }

  async getAll(userid, conversationid) {
    try {
      console.log(`[ConversationManager] getAll: ${userid} - ${conversationid}`);
      const [base, messages, memory, recommendation] = await Promise.all([
        this.getBase(userid, conversationid),
        this.getMessages(userid, conversationid),
        this.getMemory(userid, conversationid),
        this.getRecommendation(userid, conversationid),
      ]);
      return { base, messages, memory, recommendation };
    } catch (err) {
      console.error(`[ConversationManager] getAll hatası: ${userid} - ${conversationid}`, err);
      throw err;
    }
  }

  async listConversations(userid) {
    try {
      console.log(`[ConversationManager] listConversations: ${userid}`);
      const pattern = `${this.prefix}:${userid}:base:*`;
      const keys = await this.redis.keys(pattern);
      const conversationIds = keys.map((key) => key.split(":").pop());
      return conversationIds;
    } catch (err) {
      console.error(`[ConversationManager] listConversations hatası: ${userid}`, err);
      throw err;
    }
  }

  async deleteAll(userid, conversationid) {
    try {
      console.log(`[ConversationManager] deleteAll: ${userid} - ${conversationid}`);
      await Promise.all([
        this.delete(userid, `base:${conversationid}`),
        this.delete(userid, `summary:${conversationid}`),
        this.delete(userid, `messages:${conversationid}`),
      ]);
    } catch (err) {
      console.error(`[ConversationManager] deleteAll hatası: ${userid} - ${conversationid}`, err);
      throw err;
    }
  }
  async flushAll() {
    const pattern = `${this.prefix}:*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(keys);
    }
    return keys;
  }
}

module.exports = ConversationManager;
