
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

const MAX_TOTAL_SIZE = 100 * 1024 * 1024; // 100 MB

const upload = asyncHandler(async (req, res) => {
  let selectedPackage;
  const userid = req.user._id
  let _progress = 0;
  try {
    if (!req.files || !req.files.files) {
      return res.status(400).json(ApiResponse.error(400, 'Hiçbir dosya yüklenmedi.'));
    }
    let uploadedFiles = req.files.files;
    // Eğer tek dosya yüklendiyse, onu diziye çevir
    if (!Array.isArray(uploadedFiles)) {
      uploadedFiles = [uploadedFiles];
    }

    const balance = await calculateUploadBalancing(userid) //bakiyesi balance.song,balance.video
    selectedPackage = await selectedSongPackage(userid) //bakiyesi balance.song,balance.video

    if (selectedPackage == null) {
      return res.status(400).json(ApiResponse.error(400, 'Bu işlemi yapmak için geçerli bir paketin bulunmuyor..'));
    }

    // Klasör yolunu doğrulama

    let totalUploadSongFileSize;
    let totalUploadVideoFileSize;
    let totalUploadImageFileSize;
    let fileType = '';

    // Başarı ve Hata Sayısını Hesaplama
    let totalFiles;
    let successfullUploads
    let failedUploads
    let successCount
    let failureCount

    const uploadPromises = uploadedFiles.map(async (file) => {
      // Dosya türü kontrolü
      console.log("Bakiye  ->", balance)
      // { song: { upload: 512 }, video: { upload: -20 } }
      fileType = getFileType(file.mimetype)
      console.log("fileType", fileType)
      if (fileType == null) return { name: file.name, error: 'Desteklenmeyen dosya türü.', success: false };

      if (fileType == SONG) {
        if (balance.song.upload <= 0) {
          return { name: file.name, error: 'Bu ses dosyası için yeterli bakiyen bulunmamaktadır.', success: false };
        }
        if (convertUnit(file.size, "b", "mb") > balance.song.upload) {
          return { name: file.name, error: 'Bu şarkıları yüklemek için yeterli bakiyen bulunmamaktadır.', success: false };
        }
        totalUploadSongFileSize += file.size;
      } else if (fileType == VIDEO) {
        if (balance.video.upload <= 0) {
          return { name: file.name, error: 'Bu video dosyası için yeterli bakiyen bulunmamaktadır.', success: false };
        }
        totalUploadVideoFileSize += file.size;
        if (convertUnit(file.size, "b", "mb") > balance.video.upload) {
          return { name: file.name, error: 'videoları yüklemek için yeterli bakiyen bulunmamaktadır.', success: false };
        }
      } else if (fileType == IMAGE) {
        totalUploadImageFileSize += file.size;
      } else {
        return { name: file.name, error: 'Bşarkıları yüklemek için yeterli bakiyen bulunmamaktadır.', success: false };
      }
      const folderPath = getFolderPath(fileType, userid); // Örneğin: "song/66e82db61a4393764befb6b1/"
      //console.log("folderPath", folderPath)
      const uniqueFileName = `${uuidv4()}-${sanitizeFileName(file.name)}`;
      //console.log("uniqueFileName", uniqueFileName)
      const objectKey = `${folderPath.concat(uniqueFileName)}`; // Örneğin: "music/66e82db61a4393764befb6b1/uuid-filename.mp3"
      //console.log("objectKey", objectKey)
      if (folderPath && !validateFolderPath(folderPath)) {
        return { name: file.name, error: 'Geçersiz klasör yolu.', success: false };
      }

      try {
        const parallelUploads3 = new Upload({
          client: aws.init(),
          params: aws.setParam(objectKey, file.data, file.mimetype),
        });
        parallelUploads3.on('httpUploadProgress', async (progress) => {
          console.log(`Yükleme ilerlemesi (${file.name}): ${progress.loaded} / ${progress.total}`);
          _progress = progress.loaded
        });
        const data = await parallelUploads3.done();
        let uploadid = uuidv4();
        const uploadDoc = new UploadModel({
          userid: userid,
          uploadid: uploadid.toString(),
          upload_type: fileType,
          upload_size: await convertUnit(file.size, "b", "kb"), // kb olarak saklanır
          upload_unit: "kb", // kb olarak saklanır
          data: data,
          success: true,
        });
        await uploadDoc.save(
          (err, result) => {
            if (err) {
              console.log("uploadDoc err", err)
            } else {
              //console.log("uploadDoc result", result)
            }
          }
        );
        if (fileType == SONG || fileType == VIDEO) {
          const uploadUsage = new UploadUsageModel()
          uploadUsage.userid = userid
          uploadUsage.packageid = selectedPackage.packageid
          uploadUsage.upload_type = fileType
          uploadUsage.upload_size = await convertUnit(file.size, "b", "kb") // burayı kb olarak saklamamız gerekli
          await uploadUsage.save(
            (err, result) => {
              if (err) {
                console.log("uploadUsage err", err)
              } else {
                console.log("uploadUsage result", result)
              }
            }
          )
        } else if (fileType == IMAGE) {
          convertUnit
          const uploadImage = new Images({
            userid: userid,
            path: data.Location,
            uploadid
          })
          await uploadImage.save(
            (err, result) => {
              if (err) {
                console.log("uploadImage err", err)
              } else {
                console.log("uploadImage result", result)
              }
            }
          )
        }

        return { url: data.Location, uploadid, name: file.name, size: file.size, success: true, objectKey, folder: folderPath };
      } catch (err) {

        let uploadid = uuidv4();
        const uploadDoc = new UploadModel({
          userid: userid,
          uploadid,
          upload_type: fileType,
          upload_size: await convertUnit(file.size, "b", "kb"), // kb olarak saklanır
          upload_unit: "kb", // kb olarak saklanır
          data: null,
          error: err,
          success: false,
        });

        await uploadDoc.save(
          (err, result) => {
            if (err) {
              console.log("uploadDoc err", err)
            } else {
              //console.log("uploadDoc result", result)
            }
          }
        );
        console.error(`Yükleme Hatası (${file.name}):`, err);
        return { name: file.name, uploadid, error: 'Yükleme sırasında bir hata oluştu.', success: false };
      }
    })

    const uploadResults = await Promise.all(uploadPromises);
    if (!uploadResults) return res.status(400).json(ApiResponse.error(500, 'Yükleme hatası.', { error }));

    // Başarı ve Hata Sayısını Hesaplama
    totalFiles = uploadResults.length;
    successfullUploads = uploadResults.filter(result => result.success);
    failedUploads = uploadResults.filter(result => !result.success);
    successCount = successfullUploads.length;
    failureCount = failedUploads.length;

    // Geri Bildirim JSON'u Oluşturma
    const totalfilesizebyte = uploadResults.reduce((acc, file) => {
      if (file.success) {
        acc.size += file.size
        return acc
      }
      return acc
    }, { size: 0 });
    console.log("totalfilesizebyte.size", totalfilesizebyte.size)
    //Yükleme tamamlandıktan sonra bir song nesnesi oluşturulmalı
    let totalsize = await convertUnit(totalfilesizebyte.size, "b", "mb")
    return res.status(200).json(ApiResponse.success(200, 'Dosya yükleme işlemi tamamlandı.',
      {
        totalFiles: totalFiles,
        totalUploadFileSize: totalsize.toFixed(2),
        successCount: successCount,
        failureCount: failureCount,
        successfullUploads: successfullUploads.map(result => ({
          uploadid: result.uploadid,
          name: result.name,
          url: result.url
        })),
        failedUploads: failedUploads.map(result => ({
          name: result.name,
          error: result.error,
          uploadid: result.uploadid,
        }))
      }));
  } catch (error) {
    console.error('Genel Hata:', error);
    return res.status(500).json(ApiResponse.error(500, 'Sunucu hatası.', { error }));
  }
});

const uploadProfilImage = asyncHandler(async (req, res) => {
  const access_token = req.kauth.grant.access_token.token;
  // **2️⃣ Kullanıcının ID’sini Keycloak üzerinden al**
  const userInfoResponse = await axios.get(`${KEYCLOAK_BASE_URL}/realms/${REALM}/protocol/openid-connect/userinfo`, {
    headers: { Authorization: `Bearer ${access_token}` }
  });

  const user = await User.findOne({ subid: userInfoResponse.data.sub });
  const userid = user._id
  let _progress = 0;

  try {
    if (!req.files || !req.files.files) {
      return res.status(400).json(ApiResponse.error(400, 'Hiçbir dosya yüklenmedi.'));
    }
    let uploadedFiles = req.files.files;
    // Eğer tek dosya yüklendiyse, onu diziye çevir
    if (!Array.isArray(uploadedFiles)) {
      uploadedFiles = [uploadedFiles];
    }


    // Başarı ve Hata Sayısını Hesaplama
    let totalFiles;
    let successfullUploads
    let failedUploads
    let successCount
    let failureCount
    let fileType = '';
    const uploadPromises = uploadedFiles.map(async (file) => {
      // Dosya türü kontrolü

      // { song: { upload: 512 }, video: { upload: -20 } }
      fileType = getFileType(file.mimetype)
      console.log("fileType", fileType)
      if (fileType == null) return { name: file.name, error: 'Desteklenmeyen dosya türü.', success: false };


      const folderPath = getFolderPath(fileType, userid); // Örneğin: "song/66e82db61a4393764befb6b1/"
      //console.log("folderPath", folderPath)
      const uniqueFileName = `${uuidv4()}-${sanitizeFileName(file.name)}`;
      //console.log("uniqueFileName", uniqueFileName)
      const objectKey = `${folderPath.concat(uniqueFileName)}`; // Örneğin: "music/66e82db61a4393764befb6b1/uuid-filename.mp3"
      //console.log("objectKey", objectKey)
      if (folderPath && !validateFolderPath(folderPath)) {
        return { name: file.name, error: 'Geçersiz klasör yolu.', success: false };
      }

      try {
        const parallelUploads3 = new Upload({
          client: aws.init(),
          params: aws.setParam(objectKey, file.data, file.mimetype),
        });
        parallelUploads3.on('httpUploadProgress', async (progress) => {
          console.log(`Yükleme ilerlemesi (${file.name}): ${progress.loaded} / ${progress.total}`);
          _progress = progress.loaded
        });

        const data = await parallelUploads3.done();
        let uploadid = uuidv4();
        const uploadDoc = new UploadModel({
          userid: userid,
          uploadid: uploadid.toString(),
          upload_type: fileType,
          upload_size: await convertUnit(file.size, "b", "kb"), // kb olarak saklanır
          upload_unit: "kb", // kb olarak saklanır
          data: data,
          success: true,
        });
        await uploadDoc.save(
          (err, result) => {
            if (err) {
              console.log("uploadDoc err", err)
            } else {
              //console.log("uploadDoc result", result)
            }
          }
        );
        if (fileType == IMAGE) {
          const uploadImage = new Images({
            userid: userid,
            path: data.Location,
            uploadid
          })
          await uploadImage.save(
            (err, result) => {
              if (err) {
                console.log("uploadImage err", err)
              } else {
                console.log("uploadImage result", result)
              }
            }
          )

        }

        return { url: data.Location, uploadid, name: file.name, size: file.size, success: true, objectKey, folder: folderPath };
      } catch (err) {

        let uploadid = uuidv4();
        const uploadDoc = new UploadModel({
          userid: userid,
          uploadid,
          upload_type: fileType,
          upload_size: await convertUnit(file.size, "b", "kb"), // kb olarak saklanır
          upload_unit: "kb", // kb olarak saklanır
          data: null,
          error: err,
          success: false,
        });

        await uploadDoc.save(
          (err, result) => {
            if (err) {
              console.log("uploadDoc err", err)
            } else {
              //console.log("uploadDoc result", result)
            }
          }
        );
        console.error(`Yükleme Hatası (${file.name}):`, err);
        return { name: file.name, uploadid, error: 'Yükleme sırasında bir hata oluştu.', success: false };
      }
    })

    const uploadResults = await Promise.all(uploadPromises);
    if (!uploadResults) return res.status(400).json(ApiResponse.error(500, 'Yükleme hatası.', { error }));

    // Başarı ve Hata Sayısını Hesaplama
    totalFiles = uploadResults.length;
    successfullUploads = uploadResults.filter(result => result.success);
    failedUploads = uploadResults.filter(result => !result.success);
    successCount = successfullUploads.length;
    failureCount = failedUploads.length;

    // Geri Bildirim JSON'u Oluşturma
    const totalfilesizebyte = uploadResults.reduce((acc, file) => {
      if (file.success) {
        acc.size += file.size
        return acc
      }
      return acc
    }, { size: 0 });
    console.log("totalfilesizebyte.size", totalfilesizebyte.size)
    //Yükleme tamamlandıktan sonra bir song nesnesi oluşturulmalı
    let totalsize = await convertUnit(totalfilesizebyte.size, "b", "mb")
    return res.status(200).json(ApiResponse.success(200, 'Dosya yükleme işlemi tamamlandı.',
      {
        totalFiles: totalFiles,
        totalUploadFileSize: totalsize.toFixed(2),
        successCount: successCount,
        failureCount: failureCount,
        successfullUploads: successfullUploads.map(result => ({
          uploadid: result.uploadid,
          name: result.name,
          url: result.url
        })),
        failedUploads: failedUploads.map(result => ({
          name: result.name,
          error: result.error,
          uploadid: result.uploadid,
        }))
      }));
  } catch (error) {
    console.error('Genel Hata:', error);
    return res.status(500).json(ApiResponse.error(500, 'Sunucu hatası.', { error }));
  }
});

module.exports = {
  upload, uploadProfilImage
};
