const { getRabbitConnection } = require('../config/rabbitConnection');

async function sendResetPasswordEmail(to, name, resetUrl) {
  const connection = await getRabbitConnection();
  const channel = await connection.createChannel();
  const queue = 'email_queue';

  await channel.assertQueue(queue, { durable: true });

  const message = {
    type: 'reset_password',
    data: { to, name, reset_url: resetUrl, subject: 'Şifre Sıfırlama' }
  };

  channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true });

  console.log(`📨 Şifre sıfırlama maili kuyruğa eklendi: ${to}`);

  await channel.close();
  await connection.close();
}

// 📌 Örnek Kullanım
sendResetPasswordEmail('test@example.com', 'Ahmet', 'https://tinnten.com/reset?token=abc123')
  .then(() => console.log('✅ Şifre sıfırlama maili kuyruğa eklendi'))
  .catch(console.error);