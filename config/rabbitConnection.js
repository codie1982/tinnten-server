const amqp = require('amqplib');

let connection = null;
let config = {
  protocol: process.env.RABBITMQ_PROTOCOL || "amqp",
  hostname: process.env.RABBITMQ_HOST || "rabbitmq",
  port: parseInt(process.env.RABBITMQ_PORT) || 5672,
  username: process.env.RABBITMQ_USERNAME,
  password: process.env.RABBITMQ_PASSWORD,
  vhost: process.env.RABBITMQ_VHOST || "/",
  authMechanism: (process.env.RABBITMQ_AUTH_MECHANISM || "PLAIN,AMQPLAIN").split(",")
};
async function getRabbitConnection() {
  if (connection) return connection;

  try {
    connection = await amqp.connect(config);
    console.log('✅ RabbitMQ bağlantısı kuruldu.');
    return connection;
  } catch (error) {
    console.error('❌ RabbitMQ bağlantı hatası:', error);
    process.exit(1);
  }
}

module.exports = { getRabbitConnection };