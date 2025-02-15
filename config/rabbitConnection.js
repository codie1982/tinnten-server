const amqp = require('amqplib');

let connection = null;
let config = {
  protocol: "amqp",
  hostname: "localhost",
  port: 5672,
  username: "admin",
  password: "password",
  vhost: "/",
  authMechanism: ["PLATIN", "AMQPLAIN", "EXTERNAL"]

}
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