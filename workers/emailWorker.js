
require("dotenv").config()
require("colors")
const { connectRabbitWithRetry } = require('../config/rabbitConnection');
const { sendEmail } = require('../services/mailServices');
const { connectDB } = require("../config/db")
async function startWorker() {
  connectDB()
  const connection = await connectRabbitWithRetry();
  const channel = await connection.createChannel();
  const queue = 'email_queue';
  await channel.assertQueue(queue, { durable: true });
  console.log(`🎯 Mail kuyruğu dinleniyor: ${queue}`);

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
        console.log(`📨 [${message.type}] Mail Gönderiliyor: ${message.data.to}`);
        await sendEmail(message.type, message.data.to, message.data.subject, message.content);
        console.log(`✅ Mail başarıyla gönderildi: ${message.data.to}`);
        channel.ack(msg);  // Mesaj başarıyla işlendi, kuyruktan kaldır
      } catch (error) {
        console.error('❌ Mail gönderim hatası:', error);
        channel.nack(msg, false, true);  // Hata olursa mesajı tekrar kuyruğa ekle
      }
    }
  });
}

startWorker();