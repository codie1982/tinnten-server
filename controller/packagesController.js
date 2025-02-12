const asyncHandler = require("express-async-handler");
const { v4: uuidv4 } = require('uuid');
const Package = require("../models/packageModel")
const ApiResponse = require("../helpers/response")
const { validateNamePath } = require("../helpers/validatename")
const PACKAGE_TYPE = {
  FREE: "free",
  MULTIPLE: "multiple",
  STUDENT: "student",
  MAXI: "maxi",
}
const getPackages = asyncHandler(async (req, res) => {
  try {
    const packages = await PackageModel.find({ delete: false, active: true }, (["-delete", "-active", "-google_channel", "-appel_channel"]))
    if (packages.length > 0) {
      const _packages = packages.map(package => {
        delete package.google_channel
        delete package.appel_channel
        return package
      })
      return res.status(200).json(ApiResponse.success(200, 'Uygun paket listesi.', _packages));
    } else {
      return res.status(200).json(ApiResponse.error(404, 'herhangi bir paket tanımlı değil.', {}));
    }
  } catch (error) {
    console.error('Genel Hata:', err);
    return res.status(500).json(ApiResponse.error(500, 'Sunucu hatası.', { error: err.message }));
  }
});
const createPackage = asyncHandler(async (req, res) => {
  const { name, title, description, amount, currency, category,
    uploadsonglimit, uploadvideolimit, downloadsonglimit, downloadvideolimit, unit,
    package_content_type,
    unlimited, duration_time, duration_interval,
    isRenewable, renewalPrice, discount, sales_channel,
    product_id, default_package, status
  } = req.body
  const features = req.body["features[]"];
  if (!name || !title || !description || !features) {
    res.status(400).json(ApiResponse.error(400, 'lütfen tüm alanları doldurunuz.', { error: "lütfen tüm alanları doldurunuz" }));
  }
  try {
    const findPackage = await PackageModel.find({ name: name, delete: false })
    if (findPackage.length > 0) {
      res.status(400).json(ApiResponse.error(400, 'Bu paket ismi daha önce oluşturulmuş. Paket ismi benzersiz olmalı', { error: "Paket ismi benzersiz olmalı" }));
    }
    const findProductid = await PackageModel.find({ product_id })
    if (findProductid.length > 0) {
      res.status(400).json(ApiResponse.error(400, 'bu product id si ile daha önce paket oluşturulmuş.', { error: "bu product id si ile daha önce paket oluşturulmuş" }));
    }
    var _fetaures = features.map(feature => {
      return { item: feature }
    })
    //Bu paket default olarak tanımlanmış ise diğüer paketleri otomatik olarak default değerini false yapmak gerekli
    if (default_package == "true") {
      const defaultPackages = await PackageModel.find({ default_package: true, delete: false })
      if (defaultPackages) {
        for (let i = 0; i < defaultPackages.length; i++) {
          await PackageModel.findByIdAndUpdate(defaultPackages[i]._id, { default_package: false })
        }
      }
    }

    const newPackage = new PackageModel({
      name,
      title,
      description,
      price: {
        amount,
        currency
      },
      features: _fetaures,
      category,
      package_content_type,
      limit: {
        song: {
          download: downloadsonglimit,
          upload: uploadsonglimit,
          unit: unit
        },
        video: {
          download: downloadvideolimit,
          upload: uploadvideolimit,
          unit: unit
        }
      },
      duration: {
        unlimited, time: duration_time, interval: duration_interval
      },
      isRenewable,
      renewalPrice,
      discount,
      default_package: default_package === null ? false : default_package === "true" ? true : false,
      sales_channel,
      product_id,
      status
    })
    await newPackage.save((err, result) => {
      if (err) {
        console.log("err", err)
        return res.status(400).json(ApiResponse
          .error(400, 'Paket oluşturulmadı. Daha sonra tekrar deneyiniz.', err));
      } else {
        return res.status(200).json(ApiResponse
          .success(200, 'Paket başarı ile oluşturuldu.', result));
      }
    })

  } catch (err) {
    console.log("err", err)
    return res.status(500).json(ApiResponse.error(500, 'Sunucu hatası.', { error: err.message }));
  }
});

const getPackage = asyncHandler(async (req, res) => {
  const { name } = req.query
  if (!validateNamePath(name))
    return res.status(400).json(ApiResponse.error(400, 'gerçerli bir paket adı giriniz.', {}));
  try {
    const findPackage = await PackageModel.findOne({ name, delete: false }, (["-delete", "-active"]))
    if (findPackage) {
      return res.status(200).json(ApiResponse.success(200, 'Paket bulundu.', findPackage));
    } else {
      return res.status(404).json(ApiResponse.success(404, 'Paket bulunamadı. Silinmiş veya ismi değişmiş olabilir.', findPackage));
    }
  } catch (error) {
    console.error('Genel Hata:', err);
    return res.status(500).json(ApiResponse.error(500, 'Sunucu hatası.', { error: err.message }));
  }
});
// Paket silme işlemi
const deletePackage = asyncHandler(async (req, res) => {
  const package = await Package.findById(req.params.id);

  if (!package) {
    return res.status(404).json(ApiResponse.error(404, "Package not found"));
  }

  await package.remove();

  res.status(200).json(ApiResponse.success({}, 200, "Package deleted successfully"));
});
// Paket güncelleme işlemi
const updatePackage = asyncHandler(async (req, res) => {
  const package = await Package.findById(req.params.id);

  if (!package) {
    return res.status(404).json(ApiResponse.error(404, "Package not found"));
  }

  const updatedPackage = await Package.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true } // Güncellenmiş nesneyi döndür
  );

  res.status(200).json(ApiResponse.success(updatedPackage, 200, "Package updated successfully"));
});




module.exports = {
  getPackages,
  getPackage,
  createPackage,
  updatePackage,
  deletePackage,
};

