const { getRabbitConnection } = require('../config/rabbitConnection');
const { generateVerificationCode } = require('../calculate/generateVerificationCode');
const MailVerify = require("../mongoModels/mailverifyModel")

let channel = null; // Global değişken olarak kanal oluştur

async function getRabbitChannel() {
  if (!channel) {
    const connection = await getRabbitConnection();
    channel = await connection.createChannel();
    await channel.assertQueue('email_queue', { durable: true });
    console.log("📌 RabbitMQ kanalı oluşturuldu ve kuyruk hazır.");
  }
  return channel;
}

async function sendVerificationEmail(userid, to, name) {
  try {
    const channel = await getRabbitChannel();
    const verificationCode = generateVerificationCode();

    await new MailVerify({
      userid: userid,
      code: verificationCode
    }).save();

    const message = {
      type: 'verify_email',
      data: { to, subject: 'E-posta Doğrulama' },
      content: { name, verification_code: verificationCode }
    };

    channel.sendToQueue('email_queue', Buffer.from(JSON.stringify(message)), { persistent: true });

    console.log(`✅ Doğrulama maili kuyruğa eklendi: ${to}, Kod: ${verificationCode}`);
  } catch (error) {
    console.error("❌ Doğrulama mail kuyruğa eklenirken hata:", error);
  }
}

async function sendWelcomeMail(to, name) {
  try {
    const channel = await getRabbitChannel();

    const message = {
      type: 'welcome_email',
      data: { to, subject: 'Tinnten’e Hoşgeldiniz' },
      content: { username: name, login_link: "https://www.tinnten.com/conversation" }
    };

    channel.sendToQueue('email_queue', Buffer.from(JSON.stringify(message)), { persistent: true });

    console.log(`✅ Hoşgeldiniz maili kuyruğa eklendi: ${to}`);
  } catch (error) {
    console.error("❌ Hoşgeldiniz mail kuyruğa eklenirken hata:", error);
  }
}

async function checkMailVerifyCode(userid, code) {
  const mailverify = await MailVerify.findOne({ userid });
  if (!mailverify) {
    return false
  }

  // Verilen kod hatalı ise hata fırlat
  if (mailverify.code !== code) {
    return false
  }

  return true;
}

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

async function sendOfferCompleteEmail(to, name, resetUrl) {
  const connection = await getRabbitConnection();
  const channel = await connection.createChannel();
  const queue = 'email_queue';

  await channel.assertQueue(queue, { durable: true });

  const message = {
    type: 'offer_complete',
    data: { to, name, reset_url: resetUrl, subject: 'Teklif kayıt edildi.' },
    content: { username }
  };

  channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true });

  console.log(`📨 Şifre sıfırlama maili kuyruğa eklendi: ${to}`);

  await channel.close();
  await connection.close();
}
//
async function sendOfferRequestEmail(to, name, offer_description, productTitle) {
  const connection = await getRabbitConnection();
  const channel = await connection.createChannel();
  const queue = 'email_queue';

  await channel.assertQueue(queue, { durable: true });

  const message = {
    type: 'offer_request',
    data: { to, name, subject: 'Size uygun bir talep var.' },
    content: { username, offer_description }
  };

  channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true });

  console.log(`📨 Şifre sıfırlama maili kuyruğa eklendi: ${to}`);

  await channel.close();
  await connection.close();
}
async function sendOfferRequestGeneralEmail(to, name, resetUrl) {
  const connection = await getRabbitConnection();
  const channel = await connection.createChannel();
  const queue = 'email_queue';

  await channel.assertQueue(queue, { durable: true });

  const message = {
    type: 'offer_request_general',
    data: { to, name, subject: 'Size uygun bir talep var.' },
    content: { username, offer_description }
  };

  channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true });

  console.log(`📨 Şifre sıfırlama maili kuyruğa eklendi: ${to}`);

  await channel.close();
  await connection.close();
}
module.exports = {
  sendVerificationEmail, checkMailVerifyCode,
  sendWelcomeMail, sendResetPasswordEmail, sendOfferRequestEmail,
  sendOfferCompleteEmail, sendOfferRequestGeneralEmail
}