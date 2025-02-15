const { getRabbitConnection } = require('../config/rabbitConnection');

async function publishToQueue(queue, message) {
  const connection = await getRabbitConnection();
  const channel = await connection.createChannel();

  await channel.assertQueue(queue, { durable: true });
  channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true });

  console.log(`📤 Mesaj kuyruğa eklendi: ${queue}`);
  await channel.close();
}

module.exports = { publishToQueue };
