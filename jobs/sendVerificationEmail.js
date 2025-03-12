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
  const mailverify = await MailVerify.findOne({
    userid
  });
  console.log("mailverify", mailverify)
  console.log("mailverify.code === code", mailverify.code === code)
  console.log("if (new Date() > mailverify.expireDate) ", (new Date() > mailverify.expireDate) )
  if (!mailverify) return false;
  // Check if the verification code has expired
  //if (new Date() > mailverify.expireDate) return false;
  return mailverify.code === code;
}




module.exports = { sendVerificationEmail, checkMailVerifyCode, sendWelcomeMail }