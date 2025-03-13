const nodemailer = require('nodemailer');
const { parseTemplate } = require('../utils/templateParser');
const NOREPLYMAIL = ' "Tinnten" <no-reply@tinnten.com>'
const Maillog = require('../mongoModels/mailLogModel');

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
  logger: false, // Logları aç
  debug: true // Hata ayıklama modunu aç
}
);


async function sendEmail(emailType, to, subject, content) {
  console.log("Sending email to:", emailType, to, subject);
  const emailContent = await parseTemplate(emailType, content);
  console.log("emailContent",emailContent)
  if (!emailContent) {
    console.error('❌ Mail içeriği oluşturulamadı:', emailType);
    return;
  }
  const mailOptions = {
    from: NOREPLYMAIL,
    to: to,
    subject: subject || 'Bildiriminiz',
    html: emailContent,
  };
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Mail başarıyla gönderildi: ${to}`);
    // 📌 Mail logunu kaydet
    if (Maillog.db.readyState === 1) {
      await new Maillog({
        messageinfo: info,
        from: NOREPLYMAIL,
        to: to,
        subject: subject,
        text: emailContent,
        emailType: emailType,
        status: "sent"
      }).save();
    } else {
      console.warn("⚠️ MongoDB bağlantısı yok, mail logu kaydedilemedi.");
    }
    

  } catch (error) {
    console.error(`❌ Mail gönderim hatası (${emailType}):`, error);
    // 📌 Başarısız mail logunu kaydet (MongoDB bağlı mı kontrol et)
    if (Maillog.db.readyState === 1) {
      const _dc = new Maillog({
        from: NOREPLYMAIL,
        to: to,
        subject: subject,
        text: emailContent,
        emailType: emailType,
        status: "failed",
        error: error.message
      });
      await _dc.save();
    } else {
      console.warn("⚠️ MongoDB bağlantısı yok, hata logu kaydedilemedi.");
    }
  }

}





module.exports = { sendEmail };