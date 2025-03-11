const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.AMAZON_MAIL_HOST || "email-smtp.eu-central-1.amazonaws.com",
  port: 587, // 587 veya 465 kullanılabilir
  secure: false, // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USERNAME,
    pass: process.env.SMTP_PASSWORD
  },
  tls: {
    rejectUnauthorized: false,
  },
  logger: true, // Logları aç
  debug: true // Hata ayıklama modunu aç
}
);

const sendEmail = (to, subject, message) => {
  return new Promise((resolve, reject) => {
    console.log("Sending email to:", to, subject, message);
    console.log("process.env.AMAZON_MAIL_HOST", process.env.AMAZON_MAIL_HOST)
    console.log("process.env.SMTP_USERNAME", process.env.SMTP_USERNAME)
    console.log("process.env.SMTP_PASSWORD", process.env.SMTP_PASSWORD)


    const mailOptions = {
      from: "engin.erol@tinnten.com",
      to: to,
      subject: subject,
      text: message,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        reject(error)
        console.error("❌ Hata:", error);
      } else {
        resolve(info.response)
        console.log("✅ Mail başarıyla gönderildi:", info.response);
      }
    });
  });
}

module.exports = { sendEmail };