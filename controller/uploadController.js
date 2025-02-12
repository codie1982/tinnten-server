
const asyncHandler = require("express-async-handler");
const aws = require("../config/aws")
const { Upload } = require('@aws-sdk/lib-storage'); // Upload sınıfını buradan içe aktarın
const Images = require("../models/imagesModel")
const { v4: uuidv4 } = require('uuid');
const ApiResponse = require("../helpers/response")


const UploadModel = require("../models/uploadModel")
const { getFolderPath, sanitizeFileName, SONG, IMAGE, VIDEO } = require('../helpers/folder'); // Klasör yolunu belirleme fonksiyonunu içe aktarın
const { validateFolderPath } = require('../helpers/validatename'); // Klasör yolunu belirleme fonksiyonunu içe aktarın
const { convertUnit } = require("../calculate/convertUnit");
const { getFileType } = require("../helpers/fileType")

const MAX_TOTAL_SIZE = 10 * 1024 * 1024; // 10 MB

const KEYCLOAK_BASE_URL = process.env.KEYCLOAK_BASE_URL; // Keycloak URL
const REALM = process.env.REALM; // Keycloak Realm adı
const CLIENT_ID = process.env.CLIENT_ID; // Keycloak Client ID
const CLIENT_SECRET = process.env.CLIENT_SECRET; // Client Secret (Confidential Clients için)


const uploadProfilImage = asyncHandler(async (req, res) => {
  try {
    const access_token = req.kauth.grant.access_token.token;
    const userInfoResponse = await axios.get(`${KEYCLOAK_BASE_URL}/realms/${REALM}/protocol/openid-connect/userinfo`, {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const user = await User.findOne({ subid: userInfoResponse.data.sub });
    if (!user) return res.status(404).json(ApiResponse.error(404, 'Kullanıcı bulunamadı.'));

    const userid = user._id;

    if (!req.files || !req.files.files) {
      return res.status(400).json(ApiResponse.error(400, 'Hiçbir dosya yüklenmedi.'));
    }

    let uploadedFile = req.files.files;
    if (Array.isArray(uploadedFile)) {
      return res.status(400).json(ApiResponse.error(400, 'Yalnızca tek bir dosya yüklenebilir.'));
    }

    const file = uploadedFile;
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
    if (file.size > MAX_FILE_SIZE) {
      return res.status(400).json(ApiResponse.error(400, 'Dosya boyutu 10MB\'yi aşamaz.'));
    }

    const fileType = getFileType(file.mimetype);
    if (!fileType || fileType !== IMAGE) {
      return res.status(400).json(ApiResponse.error(400, 'Desteklenmeyen dosya türü. Yalnızca resim yüklenebilir.'));
    }

    // Resim boyutlarını kontrol et
    const image = await sharp(file.data).metadata();
    if (image.width > 1000 || image.height > 1000) {
      return res.status(400).json(ApiResponse.error(400, 'Resim boyutu en fazla 1000x1000 piksel olabilir.'));
    }

    const folderPath = getFolderPath(fileType, userid);
    if (!validateFolderPath(folderPath)) {
      return res.status(400).json(ApiResponse.error(400, 'Geçersiz klasör yolu.'));
    }

    const uniqueFileName = `${uuidv4()}-${sanitizeFileName(file.name)}`;
    const objectKey = `${folderPath}${uniqueFileName}`;

    const parallelUploads3 = new Upload({
      client: aws.init(),
      params: aws.setParam(objectKey, file.data, file.mimetype),
    });

    parallelUploads3.on('httpUploadProgress', (progress) => {
      console.log(`Yükleme (${file.name}): ${progress.loaded} / ${progress.total}`);
    });

    const data = await parallelUploads3.done();
    const uploadid = uuidv4();

    await new UploadModel({
      userid,
      uploadid,
      upload_type: fileType,
      upload_size: await convertUnit(file.size, "b", "kb"),
      upload_unit: "kb",
      data,
      success: true,
    }).save();

    await new Images({ userid, path: data.Location, uploadid }).save();

    return res.status(200).json(ApiResponse.success(200, 'Dosya yükleme tamamlandı.', {
      uploadid,
      name: file.name,
      url: data.Location,
      size: (file.size / (1024 * 1024)).toFixed(2) + ' MB'
    }));
  } catch (error) {
    console.error('Genel Hata:', error);
    return res.status(500).json(ApiResponse.error(500, 'Sunucu hatası.', { error: error.message }));
  }
});

module.exports = {
  uploadProfilImage
};
