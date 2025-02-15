const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'youremail@gmail.com',
    pass: 'yourpassword'
  }
});

async function sendEmail({ to, subject, message }) {
  console.log("sendEmail", to, subject, message)
}

module.exports = { sendEmail };