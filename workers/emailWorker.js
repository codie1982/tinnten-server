
require("dotenv").config()
require("colors")
const { connectRabbitWithRetry } = require('../config/rabbitConnection');
const { sendEmail } = require('../services/mailServices');
const { connectDB } = require("../config/db")
async function startWorker() {
  connectDB()
  connectRabbitWithRetry().then(async (connection) => {
    const channel = await connection.createChannel();  // <-- await eklendi
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
        }

        try {
          console.log(`📨 [${message.type}] Mail Gönderiliyor: ${message.data.to}`);
          await sendEmail(message.type, message.data.to, message.data.subject, message.content);
          console.log(`✅ Mail başarıyla gönderildi: ${message.data.to}`);
          channel.ack(msg);
        } catch (error) {
          console.error('❌ Mail gönderim hatası:', error);
          channel.nack(msg, false, true);  // Retry et
        }
      }
    });
  }).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

startWorker();