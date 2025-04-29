const axios = require('axios');

function verifyRecaptcha(token, ip) {
  const params = new URLSearchParams({
    secret: process.env.RECAPTCHA_SECRET_KEY,
    response: token,
    remoteip: ip,
  });

  return axios.post("https://www.google.com/recaptcha/api/siteverify", params)
    .then(response => response.data)
    .catch(error => {
      console.error('Error verifying recaptcha:', error);
      throw error;
    });
}

module.exports = {
  verifyRecaptcha
};