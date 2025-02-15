const { getRabbitConnection } = require('../config/rabbitConnection');
const { sendEmail } = require('../services/mailServices');

async function startWorker() {
  const connection = await getRabbitConnection();
  const channel = await connection.createChannel();
  const queue = 'email_queue';

  await channel.assertQueue(queue, { durable: true });
  console.log(`🎯 Mail kuyruğu dinleniyor: ${queue}`);

  channel.consume(queue, async (msg) => {
    if (msg !== null) {
      const message = JSON.parse(msg.content.toString());

      if (message.type === 'email') {
        try {
          await sendEmail(message.data);
          console.log(`✅ Mail gönderildi: ${message.data.to}`);
          channel.ack(msg);
        } catch (error) {
          console.error('❌ Mail gönderim hatası:', error);
          channel.nack(msg, false, true); // Tekrar denemek için mesajı kuyrukta bırak
        }
      } else {
        console.warn('⚠️ Desteklenmeyen mesaj türü:', message.type);
        channel.nack(msg, false, false); // Yanlış türdeyse mesajı sil
      }
    }
  });
}

startWorker();