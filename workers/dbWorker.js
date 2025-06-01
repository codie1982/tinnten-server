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
        console.error("❌ DB işlemi sırasında hata oluştu:", error);
        channel.nack(msg, false, true); // yeniden denenecek
      }
    });
  }).catch((error) => {
    console.error("🐇 Rabbit bağlantı hatası:", error.message);
    process.exit(1);
  });
}

startDBWorker();