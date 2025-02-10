const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
// AWS S3 Konfigürasyonu
const init = () => {
    return new S3Client({
        region: process.env.AWS_REGION,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY,
            secretAccessKey: process.env.AWS_SECRET_KEY,
        },
    });
}

const setParam = (path, data, mimetype) => {
    return {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: path, // Dosya adı
        Body: data,
        ContentType: mimetype,
    }
}
const setDownloadParam = (path) => {
    return {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: path, // Dosya adı
    }
}
const setStreamParam = (path) => {
    return {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: path, // Dosya adı
    }
}
const send = () => {
    return new S3Client({
        region: process.env.AWS_REGION,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY,
            secretAccessKey: process.env.AWS_SECRET_KEY,
        },
    });
}
// Asenkron İmzalı URL oluşturma fonksiyonu
const generateSignedUrl = async (key, expiresIn = 60 * 60) => {
    const params = {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: key
    };
    const command = new GetObjectCommand(params);
    // Asenkron olarak imzalı URL'yi döndür
    return await getSignedUrl(init(), command, { expiresIn });
};
module.exports = { init, setParam, setDownloadParam, PutObjectCommand, GetObjectCommand, generateSignedUrl, setStreamParam }