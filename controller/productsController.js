const asyncHandler = require("express-async-handler");
const { v4: uuidv4 } = require('uuid');
const Product = require("../mongoModels/productsModel")
const Price = require("../mongoModels/priceModel")
const Variant = require("../mongoModels/variantsModel")
const Gallery = require("../mongoModels/galleryModel.js")
const Image = require("../mongoModels/imagesModel")
const User = require("../mongoModels/userModel.js")
const ApiResponse = require("../helpers/response")
const Keycloak = require("../lib/Keycloak.js");



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


const getProductDetail = asyncHandler(async (req, res) => {
  try {
    const { id: productid } = req.params;

    if (productid == null) {
      return res.status(400).json(ApiResponse.error(400, 'Ürün ID boş olamaz.', {}));
    }
    // **1️⃣ Kullanıcı Keycloak'tan JWT Token al**
    const access_token = req.kauth.grant.access_token.token;

    // **2️⃣ Kullanıcının ID’sini Keycloak üzerinden al**
    const userInfo = await Keycloak.getUserInfo(access_token);

    const userkeyid = userInfo.sub;
    let user = await User.findOne({ keyid: userkeyid });
    if (!user) {
      user = await new User({ keyid: userkeyid }).save();
    }
    const userid = user._id;
    if (!userid) {
      return res.status(400).json(ApiResponse.error(400, 'Kullanıcı ID boş olamaz.', {}));
    }

    const product = await Product.findOne(
      { _id: productid },
      { vector: 0 } // örnek dışlanacak alanlar
    ).lean();

    if (product.basePrice) {
      product.basePrice = await Price.findById(product.basePrice).lean();
    }

    if (product.gallery) {
      const gallery = await Gallery.findById(product.gallery, { description: 0 }).lean();
      if (gallery?.images?.length > 0) {
        gallery.images = await Image.find({
          _id: { $in: gallery.images }
        }).lean();
      }
      product.gallery = gallery;
    }
    if (product.variants) {
      product.variants = await Variant.find({
        _id: { $in: product.variants }
      }).lean();
    }
    if (product != null) {
      return res.status(200).json(ApiResponse.success(200, 'Uygun paket listesi.', product));
    } else {
      return res.status(200).json(ApiResponse.error(404, 'herhangi bir paket tanımlı değil.', {}));
    }
  } catch (error) {
    console.error('Genel Hata:', error);
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
  getProducts, addProduct, getProductDetail
};

