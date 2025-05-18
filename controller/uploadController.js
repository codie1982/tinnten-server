
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
const Company = require("../mongoModels/companyProfilModel.js")
const Account = require("../mongoModels/accountModel.js")
const SystemPackages = require("../mongoModels/systemPackageModel.js")

const AccountManager = require("../helpers/AccountManager.js")

const { getFolderPath, sanitizeFileName, SONG, IMAGE, VIDEO, FILE } = require('../helpers/folder'); // Klasör yolunu belirleme fonksiyonunu içe aktarın
const { validateFolderPath } = require('../helpers/validatename'); // Klasör yolunu belirleme fonksiyonunu içe aktarın
const { convertUnit } = require("../calculate/convertUnit");
const { getFileType } = require("../helpers/fileType")

const logger = console
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

const uploadByCompany = asyncHandler(async (req, res) => {
  const { companyid } = req.body;

  // Token kontrolü
  const access_token = req.kauth.grant.access_token.token;
  if (!access_token) {
    return res.status(401).json(ApiResponse.error(401, "Yetkilendirme Hatası", {
      message: "Erişim tokeni bulunamadı veya geçersiz."
    }));
  }

  // Kullanıcı kontrolü
  const userkey = await Keycloak.getUserInfo(access_token);
  const user = await User.findOne({ keyid: userkey.sub });
  if (!user) {
    return res.status(404).json(ApiResponse.error(404, "Kullanıcı Bulunamadı", {
      message: "Belirtilen kullanıcı sistemde kayıtlı değil."
    }));
  }
  const userid = user._id;

  // Dosya kontrolü
  if (!req.files || !req.files.files) {
    return res.status(400).json(ApiResponse.error(400, 'Hiçbir dosya yüklenmedi.'));
  }

  // Dosyaları normalize et
  let uploadedFiles = req.files.files;
  if (!Array.isArray(uploadedFiles)) uploadedFiles = [uploadedFiles];

  // Firma kontrolü
  const companyInfo = await Company.findById(companyid);
  if (!companyInfo || !companyInfo.active) {
    return res.status(400).json({ success: false, message: "Firma bulunamadı veya aktif değil." });
  }

  // Hesap ve paket kontrolü
  const account = await Account.findById(companyInfo.account);
  const pkgIds = account.packages.map(p => p.packageid);
  const systemPackages = await SystemPackages.find({ _id: { $in: pkgIds } });
  const packagesMap = Object.fromEntries(systemPackages.map(p => [p._id.toString(), p]));
  const manager = new AccountManager(account, packagesMap);

  // Başarı & hata istatistikleri
  let successfullUploads = [];
  let failedUploads = [];

  const uploadPromises = uploadedFiles.map(async (file) => {
    const fileType = getFileType(file.mimetype);
    if (!fileType) {
      return { name: file.name, error: 'Desteklenmeyen dosya türü.', success: false };
    }

    // Quota kontrolü
    if (fileType === VIDEO && !manager.hasVideoMaxFileQuota()) {
      return { name: file.name, error: "Video Ekleme Limiti aşıldı.", success: false };
    }
    if (fileType === IMAGE && !manager.hasImageMaxFileQuota()) {
      return { name: file.name, error: "Resim Ekleme Limiti aşıldı.", success: false };
    }
    if (fileType === FILE && !manager.hasFileMaxFileQuota()) {
      return { name: file.name, error: "Dosya Ekleme Limiti aşıldı.", success: false };
    }

    // Klasör ve dosya yolu
    const folderPath = getFolderPath(fileType, userid);
    if (!validateFolderPath(folderPath)) {
      return { name: file.name, error: 'Geçersiz klasör yolu.', success: false };
    }

    const uniqueFileName = `${uuidv4()}-${sanitizeFileName(file.name)}`;
    const objectKey = `${folderPath}${uniqueFileName}`;

    try {
      const parallelUploads3 = new Upload({
        client: aws.init(),
        params: aws.setParam(objectKey, file.data, file.mimetype),
      });

      parallelUploads3.on('httpUploadProgress', (progress) => {
        console.log(`Yükleniyor (${file.name}): ${progress.loaded} / ${progress.total}`);
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

      // Quota güncelle
      if (fileType === VIDEO || fileType === IMAGE || fileType === FILE) {
        manager.incrementUsage(fileType, "maxfileupload", 1);
        await Account.updateOne({ _id: companyInfo.account }, { usage: account.usage });
      }

      return {
        success: true,
        uploadid,
        name: file.name,
        path: data.Location,
        size: file.size,
        type: fileType,
      };

    } catch (err) {
      console.error(`Hata (${file.name}):`, err);
      const uploadid = uuidv4();

      await new UploadModel({
        userid,
        uploadid,
        upload_type: fileType,
        upload_size: await convertUnit(file.size, "b", "kb"),
        upload_unit: "kb",
        data: null,
        error: err,
        success: false,
      }).save();

      return { name: file.name, uploadid, error: 'Yükleme sırasında bir hata oluştu.', success: false };
    }
  });

  // Sonuçlar
  const results = await Promise.all(uploadPromises);

  successfullUploads = results.filter(r => r.success);
  failedUploads = results.filter(r => !r.success);

  const totalSizeBytes = successfullUploads.reduce((sum, f) => sum + f.size, 0);
  const totalSizeMB = await convertUnit(totalSizeBytes, "b", "mb");
  return res.status(200).json(ApiResponse.success(200, "Dosya yükleme işlemi tamamlandı.", {
    totalFiles: results.length,
    totalUploadFileSize: totalSizeMB.toFixed(2),
    successCount: successfullUploads.length,
    failureCount: failedUploads.length,
    successfullUploads: successfullUploads.map(({ uploadid, name, path }) => ({ uploadid, name, path })),
    failedUploads: failedUploads.map(({ name, error, uploadid }) => ({ name, error, uploadid }))
  }));
});

module.exports = {
  uploadProfilImage, uploadByCompany
};
