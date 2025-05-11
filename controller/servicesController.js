const asyncHandler = require("express-async-handler");
const { v4: uuidv4 } = require('uuid');
const Service = require("../mongoModels/servicesModel")
const Price = require("../mongoModels/priceModel")
const Image = require("../mongoModels/imagesModel")
const ApiResponse = require("../helpers/response")


const getService = asyncHandler(async (req, res) => {
  try {
    const packages = await Services.find({ delete: false, active: true }, (["-delete", "-active", "-google_channel", "-appel_channel"]))
    if (packages.length > 0) {
      const _packages = packages.map(pkg => {
        delete pkg.google_channel
        delete pkg.appel_channel
        return pkg
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

const addService = asyncHandler(async (req, res) => {
  try {
    const {
      companyid, name, description, categories, features, duration, price, gallery,
      isLocationBased, location
    } = req.body;

    // **Fiyat Bilgisini Kaydetme**
    let priceId = null;
    if (price) {
      const newPrice = new Price(price);
      await newPrice.save();
      priceId = newPrice._id;
    }

    // **Görselleri Kaydetme**
    let galleryIds = [];
    if (gallery && Array.isArray(gallery)) {
      for (let image of gallery) {
        const newImage = new Image(image);
        await newImage.save();
        galleryIds.push(newImage._id);
      }
    }

    // **Yeni Hizmeti Kaydetme**
    const newService = new Service({
      companyid,
      name,
      description,
      categories,
      features,
      duration,
      price: priceId,
      gallery: galleryIds,
      isLocationBased,
      location
    });

    await newService.save();

    return res.status(201).json({ success: true, message: "Hizmet başarıyla eklendi!", service: newService });
  } catch (error) {
    console.error("Hizmet eklerken hata oluştu:", error);
    return res.status(500).json({ success: false, message: "Hizmet eklenirken hata oluştu.", error: error.message });
  }
});





module.exports = {
  getService,addService
};

