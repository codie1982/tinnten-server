
const config = {
  key: process.env.AWS_ACCESS_KEY,
  secret: process.env.AWS_SECRET_KEY,
  bucket: process.env.AWS_S3_BUCKET,
  region: process.env.AWS_REGION
}


module.exports = config