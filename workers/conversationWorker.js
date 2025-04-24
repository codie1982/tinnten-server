
require("dotenv").config()
require("colors")
const { connectRabbitWithRetry } = require('../config/rabbitConnection');
const { sendEmail } = require('../services/mailServices');
const { connectDB } = require("../config/db");
const ConversationMongoDB = require("../db/ConversationMongoDB");
async function startWorker() {
  connectDB()
  const dbCon = new ConversationMongoDB();
  const connection = await connectRabbitWithRetry();
  const channel = await connection.createChannel();
  const queue = 'conversation_queue';
  await channel.assertQueue(queue, { durable: true });
  console.log(`🎯 Konuşma kuyruğu dinleniyor: ${queue}`);

  channel.consume(queue, async (msg) => {
    if (msg !== null) {
      const message = JSON.parse(msg.content.toString());
      console.log("📩 Gelen mesaj:", message);
      if (!message?.type) {
        console.warn("❗️Mesaj tipi eksik, atlanıyor.");
        channel.ack(msg);
        return;
      } // Yanlış türdeyse mesajı işlenmiş gibi göster ve kuyruktan kaldır
      try {
        switch (message.type) {
          case "update":
            /**
             *  const message = {
              type: 'update',
              data: { messages: messageIds },
              content: { userid: userid, conversationid: conversationid }
            };
             */

            await dbCon.update(
              { userid: message.content.userid, conversationid: message.content.conversationid },
              { messages: message.data.messages });

            console.log(`📨 [update] Güncellendi: ${message.content.conversationid}`);
            break;
          case "message-update":
            // TODO: Message bazlı güncelleme işlemleri
            console.log(`📨 [${message.type}] Mesajlar güncelleniyor: ${message.data}`);
            break;
          case "conversation-summary":
            // TODO: Konuşma özetleme işlemleri (örn. LLM ile özet çıkarma)
            console.log(`📨 [${message.type}] Konuşma özeti çıkarılıyor: ${message.data}`);
            break;
          default:
            console.warn(`⚠️ Bilinmeyen mesaj tipi: ${message.type}`);
            break;
        }
        channel.ack(msg);  // Mesaj başarıyla işlendi, kuyruktan kaldır
      } catch (error) {
        console.error('❌ İşlem hatası:', error);
        channel.nack(msg, false, true); // Hata olursa mesajı tekrar kuyruğa ekle
      }
    }
  });
}

startWorker();