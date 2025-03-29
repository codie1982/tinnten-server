
const asyncHandler = require("express-async-handler");
const aws = require("../config/aws")
const { Upload } = require('@aws-sdk/lib-storage'); // Upload sınıfını buradan içe aktarın
const Images = require("../mongoModels/imagesModel")
const { v4: uuidv4 } = require('uuid');
const ApiResponse = require("../helpers/response")
const Keycloak = require("../lib/Keycloak.js");
const sharp = require("sharp")
const UploadModel = require("../mongoModels/uploadModel")
const User = require("../mongoModels/userModel.js")

const { getFolderPath, sanitizeFileName, SONG, IMAGE, VIDEO } = require('../helpers/folder'); // Klasör yolunu belirleme fonksiyonunu içe aktarın
const { validateFolderPath } = require('../helpers/validatename'); // Klasör yolunu belirleme fonksiyonunu içe aktarın
const { convertUnit } = require("../calculate/convertUnit");
const { getFileType } = require("../helpers/fileType")

const MAX_TOTAL_SIZE = 10 * 1024 * 1024; // 10 MB

const uploadProfilImage = asyncHandler(async (req, res) => {
  try {
    const access_token = req.kauth.grant.access_token.token;
    if (!access_token) {
      console.warn("Erişim tokeni bulunamadı veya geçersiz");
      return res.status(401).json(ApiResponse.error(401, "Yetkilendirme Hatası", {
        message: "Erişim tokeni bulunamadı veya geçersiz."
      }));
    }
    const userkey = await Keycloak.getUserInfo(access_token);
    const user = await User.findOne({ keyid: userkey.sub });
    if (!user) {
      return res.status(404).json(ApiResponse.error(404, "Kullanıcı Bulunamadı", {
        message: "Belirtilen kullanıcı sistemde kayıtlı değil."
      }));
    }
    const userid = user._id;

    if (!req.files || !req.files.files) {
      return res.status(400).json(ApiResponse.error(400, 'Hiçbir dosya yüklenmedi.'));
    }

    let uploadedFile = req.files.files;

    if (Array.isArray(uploadedFile)) {
      return res.status(400).json(ApiResponse.error(400, 'Yalnızca tek bir dosya yüklenebilir.'));
    }

    const file = uploadedFile;
    console.log("uploadedFile", file, file.mimetype)



    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
    if (file.size > MAX_FILE_SIZE) {
      return res.status(400).json(ApiResponse.error(400, 'Dosya boyutu 10MB\'yi aşamaz.'));
    }

    const fileType = getFileType(file.mimetype);
    if (!fileType || fileType !== IMAGE) {
      return res.status(400).json(ApiResponse.error(400, 'Desteklenmeyen dosya türü. Yalnızca resim yüklenebilir.'));
    }
    // Dosya tipinin kontrolünden hemen sonra ekleyebilirsiniz.
    const currentUploadSize = await convertUnit(file.size, "b", "kb");

    const previousUploads = await UploadModel.aggregate([
      { $match: { userid, upload_type: fileType } },
      { $group: { _id: null, totalSize: { $sum: "$upload_size" } } }
    ]);

    const totalUploaded = previousUploads.length ? Number(previousUploads[0].totalSize) : 0;

    if (totalUploaded + Number(currentUploadSize) > 10 * 1024) {  // 10 MB = 10240 KB
      return res.status(400).json(ApiResponse.error(400, 'Yükleme limitiniz aşıldı. Toplam profil resimleriniz 10MB\'yi geçemez.'));
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
    const objectKey = `profil/${folderPath}${uniqueFileName}`;

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

    const profilImage = await new Images({ userid, path: data.Location, uploadid }).save();

    return res.status(200).json(ApiResponse.success(200, 'Dosya yükleme tamamlandı.', {
      uploadid,
      name: file.name,
      url: data.Location,
      size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
      image: profilImage
    }));

  } catch (error) {
    console.error('Genel Hata:', error);
    return res.status(500).json(ApiResponse.error(500, 'Sunucu hatası.', { error: error.message }));
  }
});

module.exports = {
  uploadProfilImage
};
