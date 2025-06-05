/*
  Bu worker, RabbitMQ üzerinden gelen veritabanı işlemlerini dinler ve işler.
  İşlemler:
  - insert: Yeni belge ekler
  - update: Belge günceller
  - update_one: Tek belge günceller
  - upsert: Belge ekler veya günceller
  - bulk_insert: Birden fazla belge ekler
  - find_and_update: Belge bulur ve günceller
  - delete: Belge siler

  Her işlem için uygun MongoDB modelini kullanır.
*/
require("dotenv").config();
require("colors")
const { connectRabbitWithRetry } = require('../config/rabbitConnection');
const { connectDB } = require("../config/db");
const {
  handleInsert,
  handleUpdate,
  handleUpdateOne,
  handleUpsert,
  handleBulkInsert,
  handleFindAndUpdate,
  handleDelete,
} = require("../services/dbQueryService");
const MAX_RETRIES = 5;

async function startDBWorker() {
  connectDB();

  connectRabbitWithRetry().then(async (connection) => {
    const channel = await connection.createChannel();
    const queue = 'db_queue';
    await channel.assertQueue(queue, { durable: true });
    console.log(`📦 DB kuyruğu dinleniyor: ${queue}`);

    channel.consume(queue, async (msg) => {
      if (!msg) return;

      const message = JSON.parse(msg.content.toString());
      const retries = msg.properties.headers['x-retry-count'] || 0;


      console.log("📥 Gelen DB mesajı:", message);

      if (!message?.type || !message?.collection) {
        console.warn("❗️Geçersiz mesaj formatı. type veya collection eksik.");
        return channel.ack(msg);
      }

      try {
        switch (message.type) {
          case "insert":
            await handleInsert(message.collection, message.payload);
            break;
          case "update":
            await handleUpdate(message.collection, message.query, message.payload);
            break;
          case "update_one":
            await handleUpdateOne(message.collection, message.query, message.payload);
            break;
          case "upsert":
            await handleUpsert(message.collection, message.query, message.payload);
            break;
          case "bulk_insert":
            await handleBulkInsert(message.collection, message.payload);
            break;
          case "find_and_update":
            const updated = await handleFindAndUpdate(message.collection, message.query, message.payload);
            console.log("🔁 Güncellenen belge:", updated);
            break;
          case "delete":
            await handleDelete(message.collection, message.query);
            break;
          default:
            console.warn("🚫 Tanımsız işlem tipi:", message.type);
            break;
        }

        channel.ack(msg);
      } catch (error) {
        console.error("❌ DB işlemi sırasında hata oluştu:", error.message);

        if (retries >= MAX_RETRIES) {
          console.error("🚨 Maksimum tekrar denemesi aşıldı. Mesaj siliniyor:", message);
          return channel.ack(msg); // DLQ kullanılmıyorsa temizle
        }

        // Retry için kuyruğa yeniden gönder
        channel.sendToQueue(queue, Buffer.from(msg.content), {
          persistent: true,
          headers: {
            "x-retry-count": retries + 1,
          },
        });

        channel.ack(msg); // mevcut mesajı sil
      }
    });
  }).catch((error) => {
    console.error("🐇 Rabbit bağlantı hatası:", error.message);
    process.exit(1);
  });
}

startDBWorker();


/*
Örnek mesajlar:

  const message = {
    type: "insert",
    collection: "user",
    payload: {
      name: "Mehmet Kaya",
      email: "mehmet@example.com",
      role: "customer"
    }
  };

{
  "type": "update",
  "collection": "product",
  "query": { "sku": "ABC123" },
  "payload": { "price": 99.90, "stock": 42 }
}

{
  "type": "upsert",
  "collection": "agentresults",
  "query": { "userid": "665ac...", "type": "extend_titles" },
  "payload": {
    "result": ["Otomatik Başlık 1", "Otomatik Başlık 2"],
    "createdAt": "2024-06-01T12:00:00.000Z"
  }
}

{
  "type": "delete",
  "collection": "user",
  "query": { "email": "mehmet@example.com" }
}

{
  "type": "find_and_update",
  "collection": "user",
  "query": { "email": "mehmet@example.com" },
  "payload": { "role": "premium" }
}
*/