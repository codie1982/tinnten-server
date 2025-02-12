const amqp = require('amqplib');

let connection = null;

async function getRabbitConnection() {
  if (connection) return connection;

  try {
    connection = await amqp.connect('amqp://localhost');
    console.log('✅ RabbitMQ bağlantısı kuruldu.');
    return connection;
  } catch (error) {
    console.error('❌ RabbitMQ bağlantı hatası:', error);
    process.exit(1);
  }
}

module.exports = { getRabbitConnection };