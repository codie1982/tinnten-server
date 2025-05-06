const asyncHandler = require("express-async-handler");
const SystemPackage = require("../mongoModels/systemPackageModel")
const ApiResponse = require("../helpers/response")

const getpackages = asyncHandler(async (req, res) => {
  try {
    const packages = await SystemPackage.find({ delete: false, active: true });
    return res.status(200).json(ApiResponse.success(200, 'Paketler başarıyla getirildi.', packages));
  } catch (err) {
    console.error("Paket listeleme hatası:", err);
    return res.status(500).json(ApiResponse.error(500, 'Sunucu hatası.', { error: err.message }));
  }
});
const getuserpackages = asyncHandler(async (req, res) => {
  try {
    const packages = await SystemPackage.find({ delete: false, active: true,forCompany: false });
    return res.status(200).json(ApiResponse.success(200, 'Paketler başarıyla getirildi.', packages));
  } catch (err) {
    console.error("Paket listeleme hatası:", err);
    return res.status(500).json(ApiResponse.error(500, 'Sunucu hatası.', { error: err.message }));
  }
});
const getbuisnesspackages = asyncHandler(async (req, res) => {
  try {
    const packages = await SystemPackage.find({ delete: false, active: true,forCompany: true });
    return res.status(200).json(ApiResponse.success(200, 'Paketler başarıyla getirildi.', packages));
  } catch (err) {
    console.error("Paket listeleme hatası:", err);
    return res.status(500).json(ApiResponse.error(500, 'Sunucu hatası.', { error: err.message }));
  }
});
const create = asyncHandler(async (req, res) => {
  try {
    const {
      name, title, description, amount, currency, category, package_content_type,
      unlimited, duration_time, duration_interval, isRenewable, renewalPrice,
      discount, sales_channel, product_id, default_package, status
    } = req.body;

    const features = req.body["features[]"] || [];
    const limits = req.body.limit || {};

    // Zorunlu alanları kontrol et
    if (!name || !title || !description || features.length === 0) {
      return res.status(400).json(ApiResponse.error(400, 'Lütfen tüm alanları doldurunuz.', { error: "Lütfen tüm alanları doldurunuz" }));
    }

    // Benzersiz paket ismi kontrolü
    const findPackage = await SystemPackage.findOne({ name, delete: false });
    if (findPackage) {
      return res.status(400).json(ApiResponse.error(400, 'Bu paket ismi daha önce oluşturulmuş. Paket ismi benzersiz olmalı.', { error: "Paket ismi benzersiz olmalı" }));
    }

    // Benzersiz product_id kontrolü
    if (product_id) {
      const findProductId = await SystemPackage.findOne({ product_id });
      if (findProductId) {
        return res.status(400).json(ApiResponse.error(400, 'Bu product ID ile daha önce paket oluşturulmuş.', { error: "Bu product ID benzersiz olmalı" }));
      }
    }

    // Özellikleri dizi olarak düzenleme
    const formattedFeatures = features.map(feature => ({ item: feature }));

    // Eğer bu paket varsayılan olarak tanımlanmışsa, diğer paketleri varsayılan olmaktan çıkar
    if (default_package === "true") {
      await SystemPackage.updateMany({ default_package: true, delete: false }, { default_package: false });
    }

    // Yeni paket oluştur
    const newPackage = new SystemPackage({
      name,
      title,
      description,
      price: {
        amount: amount || 0,
        currency: currency || "USD"
      },
      features: formattedFeatures,
      category: category || "free",
      package_content_type: package_content_type || "standart",
      limit: {
        product: { max: limits.product?.max || 100 },
        services: { max: limits.services?.max || 100 },
        file: {
          download: limits.file?.download || 512,
          upload: limits.file?.upload || 512,
          maxfileupload: limits.file?.maxfileupload || 20,
          maxfileDownload: limits.file?.maxfileDownload || 20,
          unit: limits.file?.unit || "mb",
          stream: limits.file?.stream || 10,
          stream_unit: limits.file?.stream_unit || "gb"
        },
        image: {
          download: limits.image?.download || 512,
          upload: limits.image?.upload || 512,
          maxfileupload: limits.image?.maxfileupload || 20,
          maxfileDownload: limits.image?.maxfileDownload || 20,
          unit: limits.image?.unit || "mb",
          stream: limits.image?.stream || 10,
          stream_unit: limits.image?.stream_unit || "gb"
        },
        video: {
          download: limits.video?.download || 1024,
          upload: limits.video?.upload || 1024,
          maxfileupload: limits.video?.maxfileupload || 100,
          maxfileDownload: limits.video?.maxfileDownload || 100,
          unit: limits.video?.unit || "mb",
          stream: limits.video?.stream || 50,
          stream_unit: limits.video?.stream_unit || "gb"
        },
        offer: {
          max: limits.offer?.max || 10,
          regeneretetime: limits.offer?.regeneretetime || "Daiyl"
        },
        llm: {
          token: limits.llm?.token || 1024,
          regeneretetime: limits.llm?.regeneretetime || "Daiyl"
        },
        token_limit: {
          token: limits.token_limit?.token || 512,
          regeneretetime: limits.token_limit?.regeneretetime || "Daiyl"
        },
        maxDevices: limits.maxDevices || null
      },
      duration: {
        unlimited: unlimited === "true",
        time: duration_time || 30,
        interval: duration_interval || "day"
      },
      isRenewable: isRenewable || false,
      renewalPrice: renewalPrice !== undefined ? renewalPrice : null,
      discount: discount || 0,
      default_package: default_package === "true",
      sales_channel,
      product_id,
      status: status || "active"
    });

    // Paketi kaydet
    await newPackage.save();

    return res.status(201).json(ApiResponse.success(201, 'Paket başarıyla oluşturuldu.', newPackage));

  } catch (err) {
    console.error("Paket oluşturma hatası:", err);
    return res.status(500).json(ApiResponse.error(500, 'Sunucu hatası.', { error: err.message }));
  }
});
const getpackage = asyncHandler(async (req, res) => {
  try {
    const packageid = req.params.id;
    const packageData = await SystemPackage.findOne({ _id: packageid, delete: false });

    if (!packageData) {
      return res.status(404).json(ApiResponse.error(404, 'Paket bulunamadı.', { error: "Paket mevcut değil veya silinmiş." }));
    }

    return res.status(200).json(ApiResponse.success(200, 'Paket başarıyla getirildi.', packageData));
  } catch (err) {
    console.error("Paket getirme hatası:", err);
    return res.status(500).json(ApiResponse.error(500, 'Sunucu hatası.', { error: err.message }));
  }
});
// Paket silme işlemi
const deletePackage = asyncHandler(async (req, res) => {
  try {
    const packageid = req.params.id;
    const packageData = await SystemPackage.findOne({ _id: packageid, delete: false });

    if (!packageData) {
      return res.status(404).json(ApiResponse.error(404, 'Paket bulunamadı.', { error: "Paket mevcut değil veya silinmiş." }));
    }

    packageData.delete = true;
    await packageData.save();

    return res.status(200).json(ApiResponse.success(200, 'Paket başarıyla silindi.', packageData));
  } catch (err) {
    console.error("Paket silme hatası:", err);
    return res.status(500).json(ApiResponse.error(500, 'Sunucu hatası.', { error: err.message }));
  }
});
// Paket güncelleme işlemi
const update = asyncHandler(async (req, res) => {
  try {
    const packageid = req.params.id;
    const updates = req.body;

    const packageData = await SystemPackage.findOne({ _id: packageid, delete: false });
    if (!packageData) {
      return res.status(404).json(ApiResponse.error(404, 'Paket bulunamadı.', { error: "Paket mevcut değil veya silinmiş." }));
    }

    Object.assign(packageData, updates);
    await packageData.save();

    return res.status(200).json(ApiResponse.success(200, 'Paket başarıyla güncellendi.', packageData));
  } catch (err) {
    console.error("Paket güncelleme hatası:", err);
    return res.status(500).json(ApiResponse.error(500, 'Sunucu hatası.', { error: err.message }));
  }
});
const harddelete = asyncHandler(async (req, res) => {
  try {
    const packageId = req.params.id;
    const packageData = await SystemPackage.findByIdAndDelete(packageId);

    if (!packageData) {
      return res.status(404).json(ApiResponse.error(404, 'Paket bulunamadı.', { error: "Paket zaten silinmiş veya mevcut değil." }));
    }

    return res.status(200).json(ApiResponse.success(200, 'Paket kalıcı olarak silindi.', packageData));
  } catch (err) {
    console.error("Paket kalıcı silme hatası:", err);
    return res.status(500).json(ApiResponse.error(500, 'Sunucu hatası.', { error: err.message }));
  }
});
const filterpackages = asyncHandler(async (req, res) => {
  try {
    const filters = { delete: false };
    
    if (req.query.category) filters.category = req.query.category;
    if (req.query.status) filters.status = req.query.status;
    
    const packages = await SystemPackage.find(filters);
    return res.status(200).json(ApiResponse.success(200, 'Filtrelenmiş paketler getirildi.', packages));
  } catch (err) {
    console.error("Filtreleme hatası:", err);
    return res.status(500).json(ApiResponse.error(500, 'Sunucu hatası.', { error: err.message }));
  }
});


module.exports = {
  getpackages,
  getuserpackages,
  getbuisnesspackages,
  getpackage,
  create,
  update,
  deletePackage,
  harddelete,
  filterpackages
};

