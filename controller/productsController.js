const asyncHandler = require("express-async-handler");
const { v4: uuidv4 } = require('uuid');
const Product = require("../models/productsModel")
const Price = require("../models/priceModel")
const Variant = require("../models/variantsModel")
const Image = require("../models/imagesModel")
const ApiResponse = require("../helpers/response")


const getProducts = asyncHandler(async (req, res) => {
  try {
    const packages = await Products.find({ delete: false, active: true }, (["-delete", "-active", "-google_channel", "-appel_channel"]))
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

const addProduct = asyncHandler(async (req, res) => {
  try {
    const { 
      companyid, name, description, categories, basePrice, variants, gallery, attributes 
    } = req.body;

    // **Base Price İşlemleri (Fiyatları Kaydet)**
    let basePriceIds = [];
    if (basePrice && Array.isArray(basePrice)) {
      for (let priceData of basePrice) {
        const newPrice = new Price(priceData);
        await newPrice.save();
        basePriceIds.push(newPrice._id);
      }
    }

    // **Varyant İşlemleri (Fiyatı önce kaydedip, sonra ObjectId olarak ekle)**
    let variantIds = [];
    if (variants && Array.isArray(variants)) {
      for (let variantData of variants) {
        let priceId = null;

        if (variantData.price) {
          const newPrice = new Price(variantData.price);
          await newPrice.save();
          priceId = newPrice._id;
        }

        const newVariant = new Variant({
          sku: variantData.sku,
          stock: variantData.stock,
          price: priceId, // ObjectId olarak ekleniyor
          attributes: variantData.attributes
        });
        await newVariant.save();
        variantIds.push(newVariant._id);
      }
    }

    // **Görsel İşlemleri**
    let galleryIds = [];
    if (gallery && Array.isArray(gallery)) {
      for (let imageData of gallery) {
        const newImage = new Image(imageData);
        await newImage.save();
        galleryIds.push(newImage._id);
      }
    }

    // **Yeni Ürünü Kaydetme**
    const newProduct = new Product({
      companyid,
      name,
      description,
      categories,
      basePrice: basePriceIds,
      variants: variantIds,
      gallery: galleryIds,
      attributes
    });

    await newProduct.save();

    return res.status(201).json({ success: true, message: "Ürün başarıyla eklendi!", product: newProduct });
  } catch (error) {
    console.error("Ürün eklerken hata oluştu:", error);
    return res.status(500).json({ success: false, message: "Ürün eklenirken hata oluştu.", error: error.message });
  }
});

module.exports = {
  getProducts,addProduct
};

