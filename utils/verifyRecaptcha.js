export async function verifyRecaptcha(token, ip) {
  const response = await axios.post(
    "https://www.google.com/recaptcha/api/siteverify",
    new URLSearchParams({
      secret: process.env.RECAPTCHA_SECRET_KEY,
      response: token,
      remoteip: ip,
    })
  );
  return response.data;
}