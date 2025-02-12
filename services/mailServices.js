const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'youremail@gmail.com',
    pass: 'yourpassword'
  }
});

async function sendEmail({ to, subject, message }) {
  await transporter.sendMail({
    from: 'youremail@gmail.com',
    to,
    subject,
    text: message
  });
}

module.exports = { sendEmail };