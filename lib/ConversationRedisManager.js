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

  async getConversation(userid, conversationid) {
    console.log(`[ConversationRedisManager] getConversation.`, userid, conversationid);
    //const base = await this.get(userid, `base:${conversationid}`)

    const [base, summary, messages] = await Promise.all([
      this.getBase(userid, conversationid),
      this.getSummary(userid, conversationid),
      this.getMessages(userid, conversationid),
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
      console.log(`[ConversationManager] getBase: ${userid} - ${conversationid}`);
      return await this.get(userid, `base:${conversationid}`);
    } catch (err) {
      console.error(`[ConversationManager] getBase hatası: ${userid} - ${conversationid}`, err);
      throw err;
    }
  }

  async setMessages(userid, conversationid, messages, ttl = 3600) {
    try {
      console.log(`[ConversationManager] setMessages: ${userid} - ${conversationid}`);
      return await this.set(userid, `messages:${conversationid}`, messages ? JSON.stringify(messages) : "", ttl);
    } catch (err) {
      console.error(`[ConversationManager] setMessages hatası: ${userid} - ${conversationid}`, err);
      throw err;
    }
  }
  async addMessages(userid, conversationid, newMessages, ttl = 3600) {
    try {
      console.log(`[addMessages] addMessages: ${userid} - ${conversationid}`);
  
      // Redis’ten mevcut mesajları al (null olabilir)
      let currentMessages = await this.getMessages(userid, conversationid);
      if (!Array.isArray(currentMessages)) {
        currentMessages = [];
      }
  
      // Yeni mesaj(lar)ı ekle
      if (Array.isArray(newMessages)) {
        currentMessages = currentMessages.concat(newMessages);
      } else {
        currentMessages.push(newMessages);
      }
  
      console.log(`[addMessages] updated messages:`, currentMessages);
  
      // Redis’e geri yaz
      return await this.setMessages(userid, conversationid, currentMessages, ttl);
    } catch (err) {
      console.error(`[ConversationManager] addMessages hatası: ${userid} - ${conversationid}`, err);
      throw err;
    }
  }
  async updateMessages(userid, conversationid, messageid, message, ttl = 3600) {
    try {
      console.log(`[updateMessages] updateMessages: ${userid} - ${conversationid} - messageid: ${messageid}`);
  
      let currentMessages = await this.getMessages(userid, conversationid);
      if (!Array.isArray(currentMessages)) currentMessages = [];
  
      const index = currentMessages.findIndex(m => m._id?.toString() === messageid.toString());
  
      if (index !== -1) {
        console.log(`[updateMessages] Mesaj güncelleniyor: ${messageid}`);
        // Eğer eski mesaj varsa ve preserve edilecek başka alanlar varsa burada yapılabilir
        currentMessages[index] = { ...currentMessages[index], ...message };
      } else {
        console.log(`[updateMessages] Mesaj bulunamadı, ekleniyor: ${messageid}`);
        currentMessages.push(message);
      }
  
      return await this.setMessages(userid, conversationid, currentMessages, ttl);
    } catch (err) {
      console.error(`[ConversationManager] updateMessages hatası: ${userid} - ${conversationid}`, err);
      throw err;
    }
  }



  async getMessages(userid, conversationid) {
    try {
      console.log(`[ConversationManager] getMessages: ${userid} - ${conversationid}`);
      let msg = JSON.parse(await this.get(userid, `messages:${conversationid}`));
      console.log(`[ConversationManager] msg: ${msg}`);

      return msg
    } catch (err) {
      console.error(`[ConversationManager] getMessages hatası: ${userid} - ${conversationid}`, err);
      throw err;
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
      console.log(`[ConversationManager] getSummary: ${userid} - ${conversationid}`);
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
}

module.exports = ConversationManager;
