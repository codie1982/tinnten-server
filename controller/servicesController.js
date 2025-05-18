const asyncHandler = require("express-async-handler");
const axios = require("axios")
const { v4: uuidv4 } = require('uuid');
const Service = require("../mongoModels/servicesModel")
const Price = require("../mongoModels/priceModel")
const Image = require("../mongoModels/imagesModel")
const Company = require("../mongoModels/companyProfilModel.js")
const Account = require("../mongoModels/accountModel.js")
const SystemPackages = require("../mongoModels/systemPackageModel.js")
const Gallery = require("../mongoModels/galleryModel.js")
const User = require("../mongoModels/userModel.js")

const ApiResponse = require("../helpers/response")
const AccountManager = require("../helpers/AccountManager.js")

const Keycloak = require("../lib/Keycloak.js");

/**
 * @desc Belirli bir firmaya ait hizmetleri listeler
 * @route GET /api/v10/services/:id
 * @access Private (firma kullanıcısı)
 */
const getServices = asyncHandler(async (req, res) => {
  const { id: companyid } = req.params;

  if (!companyid) {
    return res.status(400).json(ApiResponse.error(400, "Firma ID si boş olamaz.", {}));
  }

  const access_token = req.kauth.grant.access_token.token;
  const userInfo = await Keycloak.getUserInfo(access_token);
  const userkeyid = userInfo.sub;

  let user = await User.findOne({ keyid: userkeyid });
  if (!user) {
    user = await new User({ keyid: userkeyid }).save();
  }

  const isUserInCompany = await Company.exists({
    _id: companyid,
    "employees.userid": user._id
  });

  if (!isUserInCompany) {
    return res.status(403).json(ApiResponse.error(403, "Bu firmaya erişim yetkiniz yok.", {}));
  }

  const services = await Service.find({ companyid })
    .populate({ path: "price", model: "Price" })
    .populate({
      path: "gallery",
      populate: { path: "images", model: "images" }
    })
    .populate({ path: "requestForm", model: "dynamicform" })
    .sort({ createdAt: -1 });

  if (services.length === 0) {
    return res.status(200).json(ApiResponse.error(404, "Herhangi bir hizmet bulunamadı.", {}));
  }

  return res.status(200).json(ApiResponse.success(200, "Hizmet listesi başarıyla alındı.", services));
});
/**
 * @desc Belirli bir hizmetin detay bilgilerini getirir
 * @route GET /api/v10/services/:id/:sid
 * @access Private (firma kullanıcısı)
 */
const getServiceDetail = asyncHandler(async (req, res) => {
  const { id: companyid, sid: serviceid } = req.params;

  const access_token = req.kauth.grant.access_token.token;
  const userInfo = await Keycloak.getUserInfo(access_token);
  const userkeyid = userInfo.sub;

  let user = await User.findOne({ keyid: userkeyid });
  if (!user) {
    user = await new User({ keyid: userkeyid }).save();
  }

  const isUserInCompany = await Company.exists({
    _id: companyid,
    "employees.userid": user._id
  });

  if (!isUserInCompany) {
    return res.status(403).json(ApiResponse.error(403, "Bu firmaya erişim yetkiniz yok.", {}));
  }

  const service = await Service.findOne({ _id: serviceid, companyid })
    .populate({ path: "price", model: "Price" })
    .populate({
      path: "gallery",
      populate: { path: "images", model: "images" }
    })
    .populate({ path: "requestForm", model: "dynamicform" });

  if (!service) {
    return res.status(404).json(ApiResponse.error(404, "Hizmet bulunamadı."));
  }

  return res.status(200).json(ApiResponse.success(200, "Hizmet detayları başarıyla alındı.", service));
});
/**
 * @desc Yeni hizmet ekler
 * @route POST /api/v10/services
 * @access Private (firma kullanıcısı)
 */
const addService = asyncHandler(async (req, res) => {
  try {
    const {
      companyid,
      name,
      description,
      categories,
      features,
      duration,
      price,
      gallery,
      isLocationBased,
      location,
      isOfferable,
      requestForm
    } = req.body;

    // === [1] Kullanıcı Doğrulama (Keycloak)
    const access_token = req.kauth.grant.access_token.token;
    const userInfo = await Keycloak.getUserInfo(access_token);
    const userkeyid = userInfo.sub;

    let user = await User.findOne({ keyid: userkeyid });
    if (!user) user = await new User({ keyid: userkeyid }).save();
    const userid = user._id;

    // === [2] Firma ve Kullanıcı Yetki Kontrolü
    const companyInfo = await Company.findById(companyid);
    if (!companyInfo || !companyInfo.active) {
      return res.status(400).json(ApiResponse.error(400, "Firma bulunamadı veya aktif değil."));
    }

    const isUserInCompany = await Company.exists({
      _id: companyid,
      "employees.userid": userid
    });

    if (!isUserInCompany) {
      return res.status(403).json(ApiResponse.error(403, "Bu firmaya hizmet ekleme yetkiniz yok."));
    }

    // === [3] Account ve Kota Kontrolü
    const account = await Account.findById(companyInfo.account);
    const pkgIds = account.packages.map(p => p.packageid);
    const systemPackages = await SystemPackages.find({ _id: { $in: pkgIds } });
    const packagesMap = Object.fromEntries(systemPackages.map(p => [p._id.toString(), p]));
    const manager = new AccountManager(account, packagesMap);

    if (!manager.hasAddServicesQuota()) {
      return res.status(403).json(ApiResponse.error(403, "Hizmet ekleme kotanız doldu."));
    }

    // === [4] Fiyat Kaydı
    let priceId = null;
    if (price && typeof price.originalPrice === "number") {
      const newPrice = new Price(price);
      await newPrice.save();
      priceId = newPrice._id;
    }

    // === [5] Galeri + Görseller
    let galleryId = null;
    if (gallery && gallery.images) {
      if (!Array.isArray(gallery.images)) {
        return res.status(400).json(ApiResponse.error(400, "gallery.images bir dizi olmalıdır."));
      }

      const imageIds = [];
      for (const imageData of gallery.images) {
        if (!imageData.path || typeof imageData.path !== "string" || !["internal", "external"].includes(imageData.type)) {
          return res.status(400).json(ApiResponse.error(400, "Her görsel geçerli path ve type içermelidir."));
        }

        const newImage = new Image({
          path: imageData.path,
          type: imageData.type,
          uploadid: imageData.uploadid,
          userid
        });
        await newImage.save();
        imageIds.push(newImage._id);
      }

      const newGallery = new Gallery({
        title: gallery.title || name,
        description: gallery.description || "",
        images: imageIds
      });

      await newGallery.save();
      galleryId = newGallery._id;
    }
    if (requestForm) {
      const formExists = await DynamicForm.exists({ _id: requestForm });
      if (!formExists) {
        return res.status(400).json(ApiResponse.error(400, "Geçersiz requestForm ID."));
      }
    }
    // === [6] Hizmet Kaydı (embedding'siz)
    const newService = new Service({
      companyid,
      name,
      description,
      categories,
      features,
      duration,
      price: priceId,
      gallery: galleryId,
      isLocationBased: isLocationBased === true,
      location,
      isOfferable,
      requestForm: requestForm || null,
      vector: [] // Embedding henüz yok
    });

    await newService.save();

    // === [7] Embedding işlemi
    const vectorTextParts = [
      name,
      description,
      categories?.join(" "),
      features?.join(" "),
      duration
    ];

    const vectorText = vectorTextParts
      .filter(Boolean)
      .map(text => text.toString().trim())
      .join(" ")
      .slice(0, 1000);

    const vectorResponse = await axios.post(`${process.env.EMBEDDING_URL}/api/v10/llm/vector`, {
      text: vectorText
    });

    if (vectorResponse?.data) {
      await Service.updateOne({ _id: newService._id }, { vector: vectorResponse.data });
    }

    // === [8] Usage Güncelle
    const updatedUsage = manager.incrementUsage("services", "max", 1);
    account.usage = updatedUsage;
    await account.save();

    return res.status(201).json(ApiResponse.success(201, "Hizmet başarıyla eklendi.", newService));

  } catch (err) {
    console.error("❌ addService Hatası:", err);
    return res.status(500).json(ApiResponse.error(500, "Sunucu hatası.", { error: err.message }));
  }
});

/**
 * @desc Hizmetin temel alanlarını günceller (alt referanslar hariç)
 * @route PUT /api/v10/services/:companyid/:serviceid
 */
const updateService = asyncHandler(async (req, res) => {
  const { companyid, serviceid } = req.params;
  const {
    name,
    description,
    categories,
    features,
    duration,
    isLocationBased,
    location,
    isOfferable,
    requestForm
  } = req.body;

  const access_token = req.kauth.grant.access_token.token;
  const userInfo = await Keycloak.getUserInfo(access_token);
  const userkeyid = userInfo.sub;

  const user = await User.findOne({ keyid: userkeyid });
  if (!user) return res.status(403).json(ApiResponse.error(403, "Kullanıcı bulunamadı."));

  const company = await Company.findById(companyid);
  if (!company || !company.active)
    return res.status(404).json(ApiResponse.error(404, "Firma bulunamadı veya aktif değil."));

  const isUserInCompany = await Company.exists({
    _id: companyid,
    "employees.userid": user._id
  });

  if (!isUserInCompany) {
    return res.status(403).json(ApiResponse.error(403, "Yetkiniz yok."));
  }

  const service = await Service.findOne({ _id: serviceid, companyid });
  if (!service) {
    return res.status(404).json(ApiResponse.error(404, "Hizmet bulunamadı."));
  }

  if (name) service.name = name;
  if (description) service.description = description;
  if (Array.isArray(categories)) service.categories = categories;
  if (Array.isArray(features)) service.features = features;
  if (duration) service.duration = duration;
  if (typeof isLocationBased === "boolean") service.isLocationBased = isLocationBased;
  if (location) service.location = location;

  if (requestForm) {
    const formExists = await DynamicForm.exists({ _id: requestForm });
    if (!formExists) {
      return res.status(400).json(ApiResponse.error(400, "Geçersiz requestForm ID."));
    }
    service.requestForm = requestForm;
  }

  await service.save();

  return res.status(200).json(ApiResponse.success(200, "Hizmet başarıyla güncellendi.", service));
});
/**
 * @desc Hizmete ait fiyat bilgisini günceller (yeni Price kaydı ile değiştirir)
 * @route PUT /api/v10/services/:companyid/:serviceid/price
 */
const updateServicePrice = asyncHandler(async (req, res) => {
  const { companyid, serviceid } = req.params;
  const { price } = req.body;

  if (!price || typeof price.originalPrice !== "number") {
    return res.status(400).json(ApiResponse.error(400, "Geçerli fiyat bilgisi girilmelidir."));
  }

  const newPrice = new Price(price);
  await newPrice.save();

  await Service.updateOne({ _id: serviceid, companyid }, { price: newPrice._id });

  return res.status(200).json(ApiResponse.success(200, "Fiyat güncellendi.", newPrice._id));
});
/**
 * @desc Hizmete ait galeriyi günceller (yeni Image ve Gallery oluşturur)
 * @route PUT /api/v10/services/:companyid/:serviceid/gallery
 */
const updateServiceGallery = asyncHandler(async (req, res) => {
  const { companyid, serviceid } = req.params;
  const { gallery } = req.body;

  if (!gallery || !Array.isArray(gallery.images)) {
    return res.status(400).json(ApiResponse.error(400, "gallery.images dizisi zorunludur."));
  }

  const service = await Service.findOne({ _id: serviceid, companyid });
  if (!service) return res.status(404).json(ApiResponse.error(404, "Hizmet bulunamadı."));

  const imageIds = [];

  for (const image of gallery.images) {
    const newImage = new Image({
      path: image.path,
      type: image.type || "internal",
      uploadid: image.uploadid
    });
    await newImage.save();
    imageIds.push(newImage._id);
  }

  const newGallery = new Gallery({
    title: gallery.title || service.name,
    description: gallery.description || "",
    images: imageIds
  });

  await newGallery.save();

  await Service.updateOne({ _id: serviceid }, { gallery: newGallery._id });

  return res.status(200).json(ApiResponse.success(200, "Galeri güncellendi.", newGallery._id));
});
/**
 * @desc Hizmete ait requestForm alanını günceller
 * @route PUT /api/v10/services/:companyid/:serviceid/request-form
 * @access Private (firma kullanıcısı)
 */
const updateServiceRequestForm = asyncHandler(async (req, res) => {
  const { companyid, serviceid } = req.params;
  const { requestFormId } = req.body;

  if (!requestFormId) {
    return res.status(400).json(ApiResponse.error(400, "requestFormId zorunludur."));
  }

  const access_token = req.kauth.grant.access_token.token;
  const userInfo = await Keycloak.getUserInfo(access_token);
  const userkeyid = userInfo.sub;

  const user = await User.findOne({ keyid: userkeyid });
  if (!user) return res.status(403).json(ApiResponse.error(403, "Kullanıcı bulunamadı."));

  const isUserInCompany = await Company.exists({
    _id: companyid,
    "employees.userid": user._id
  });

  if (!isUserInCompany) {
    return res.status(403).json(ApiResponse.error(403, "Yetkiniz yok."));
  }

  const service = await Service.findOne({ _id: serviceid, companyid });
  if (!service) {
    return res.status(404).json(ApiResponse.error(404, "Hizmet bulunamadı."));
  }

  const formExists = await DynamicForm.exists({ _id: requestFormId });
  if (!formExists) {
    return res.status(400).json(ApiResponse.error(400, "Geçersiz requestForm ID."));
  }

  service.requestForm = requestFormId;
  await service.save();

  return res.status(200).json(ApiResponse.success(200, "Request form başarıyla güncellendi.", requestFormId));
});
/**
 * @desc Hizmeti siler (referanslı alt veriler elle silinmelidir)
 * @route DELETE /api/v10/services/:companyid/:serviceid
 */
const deleteService = asyncHandler(async (req, res) => {
  const { companyid, serviceid } = req.params;

  const access_token = req.kauth.grant.access_token.token;
  const userInfo = await Keycloak.getUserInfo(access_token);
  const userkeyid = userInfo.sub;

  const user = await User.findOne({ keyid: userkeyid });
  if (!user) return res.status(403).json(ApiResponse.error(403, "Kullanıcı bulunamadı."));

  const isUserInCompany = await Company.exists({
    _id: companyid,
    "employees.userid": user._id
  });

  if (!isUserInCompany) {
    return res.status(403).json(ApiResponse.error(403, "Yetkiniz yok."));
  }

  const service = await Service.findOne({ _id: serviceid, companyid });
  if (!service) {
    return res.status(404).json(ApiResponse.error(404, "Hizmet bulunamadı."));
  }

  await Service.deleteOne({ _id: serviceid });

  return res.status(200).json(ApiResponse.success(200, "Hizmet silindi."));
});
/**
 * @desc Hizmete ait fiyat bilgisini siler
 * @route DELETE /api/v10/services/:companyid/:serviceid/price
 */
const deleteServicePrice = asyncHandler(async (req, res) => {
  const { companyid, serviceid } = req.params;

  const service = await Service.findOne({ _id: serviceid, companyid });
  if (!service || !service.price) {
    return res.status(404).json(ApiResponse.error(404, "Fiyat bilgisi bulunamadı."));
  }

  await Price.deleteOne({ _id: service.price });
  await Service.updateOne({ _id: serviceid }, { price: null });

  return res.status(200).json(ApiResponse.success(200, "Fiyat silindi."));
});
/**
 * @desc Hizmete ait galeriyi ve görselleri siler
 * @route DELETE /api/v10/services/:companyid/:serviceid/gallery
 */
const deleteServiceGallery = asyncHandler(async (req, res) => {
  const { companyid, serviceid } = req.params;

  const service = await Service.findOne({ _id: serviceid, companyid }).populate({
    path: "gallery",
    populate: { path: "images" }
  });

  if (!service || !service.gallery) {
    return res.status(404).json(ApiResponse.error(404, "Galeri bulunamadı."));
  }

  const imageIds = service.gallery.images?.map(img => img._id) || [];

  await Image.deleteMany({ _id: { $in: imageIds } });
  await Gallery.deleteOne({ _id: service.gallery._id });

  await Service.updateOne({ _id: serviceid }, { gallery: null });

  return res.status(200).json(ApiResponse.success(200, "Galeri ve görseller silindi."));
});
/**
 * @desc Hizmete bağlı olan request formu siler
 * @route DELETE /api/v10/services/:companyid/:serviceid/request-form
 */
const deleteServiceRequestForm = asyncHandler(async (req, res) => {
  const { companyid, serviceid } = req.params;

  const service = await Service.findOne({ _id: serviceid, companyid });
  if (!service || !service.requestForm) {
    return res.status(404).json(ApiResponse.error(404, "RequestForm bulunamadı."));
  }

  await DynamicForm.deleteOne({ _id: service.requestForm });
  await Service.updateOne({ _id: serviceid }, { requestForm: null });

  return res.status(200).json(ApiResponse.success(200, "RequestForm silindi."));
});

module.exports = {
  getServices,
  getServiceDetail, addService, deleteServiceRequestForm,
  deleteServiceGallery, deleteServicePrice, deleteService,
  updateServiceRequestForm, updateServiceGallery, updateServicePrice, updateService
};

