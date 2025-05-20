const asyncHandler = require("express-async-handler");
const axios = require("axios")
const validator = require("validator");
const Company = require("../mongoModels/companyProfilModel.js")
const Account = require("../mongoModels/accountModel.js")
const SystemPackages = require("../mongoModels/systemPackageModel.js")
const Product = require("../mongoModels/productsModel")
const Price = require("../mongoModels/priceModel")
const Variant = require("../mongoModels/variantsModel")
const Gallery = require("../mongoModels/galleryModel.js")
const Image = require("../mongoModels/imagesModel")
const User = require("../mongoModels/userModel.js")
const ApiResponse = require("../helpers/response")
const Keycloak = require("../lib/Keycloak.js");

const AccountManager = require("../helpers/AccountManager.js")

/**
 * @desc Yeni bir ürün ekler (alt kırılımlar hariç)
 * @route POST /api/v1/products
 * @access Private (firma kullanıcısı)
 */
const addProduct = asyncHandler(async (req, res) => {
  try {
    const {
      companyid,
      title,
      meta,
      description,
      categories,
      redirectUrl,
      attributes,
      basePrice,
      variants,
      gallery,
      isbn,
      type = "product", // default product
      isOfferable = false,
      rentalPeriod,
      requestForm
    } = req.body;

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

    const companyInfo = await Company.findById({ _id: companyid });

    if (!companyInfo || !companyInfo.active) {
      return res.status(400).json({ success: false, message: "Firma bulunamadı veya aktif değil." });
    }

    const isUserInCompany = await Company.exists({
      _id: companyid,
      "employees.userid": userid // veya token'dan gelen userId
    });

    if (!isUserInCompany) {
      return res.status(403).json({ success: false, message: "Bu firmaya ürün ekleme yetkiniz yok." });
    }
    companyInfo.packageid

    const account = await Account.findById(companyInfo.account);
    const pkgIds = account.packages.map(p => p.packageid);
    const systemPackages = await SystemPackages.find({ _id: { $in: pkgIds } });
    const packagesMap = Object.fromEntries(systemPackages.map(p => [p._id.toString(), p]));
    const manager = new AccountManager(account, packagesMap);


    if (!manager.hasAddProductQuota()) {
      return res.status(403).json({ error: "Ekleme Limiti aşıldı." });
    }

    // === [1] Gerekli Alan Kontrolleri ===
    if (!title || typeof title !== "string" || !validator.isLength(title, { min: 2, max: 100 })) {
      return res.status(400).json({ success: false, message: "Ürün başlığı geçersiz veya eksik." });
    }

    if (basePrice && typeof basePrice.originalPrice !== "number" && !isOfferable) {
      return res.status(400).json({ success: false, message: "Geçerli bir originalPrice girilmelidir." });
    }

    if (!["product", "service", "rental", "listing", "offer_based"].includes(type)) {
      return res.status(400).json({ success: false, message: "Geçersiz ürün tipi." });
    }

    // === [2] Tip ve Format Kontrolleri ===
    if (redirectUrl && !validator.isURL(redirectUrl)) {
      return res.status(400).json({ success: false, message: "Geçerli bir redirect URL girilmelidir." });
    }

    if (categories && !Array.isArray(categories)) {
      return res.status(400).json({ success: false, message: "Categories alanı dizi (array) olmalıdır." });
    }

    if (attributes && (!Array.isArray(attributes) || attributes.some(attr => !attr.name || !attr.value))) {
      return res.status(400).json({ success: false, message: "Her attribute 'name' ve 'value' içermelidir." });
    }



    //TODO : requestForm alanı _id değeri olmalı ve DBde bu kişiye ait formlardan birisimi diye sorgulanmalı


    // === [3] Base Price Kaydı ===
    let basePriceId = null;
    if (basePrice && typeof basePrice.originalPrice === "number") {
      const newPrice = new Price(basePrice);
      await newPrice.save();
      basePriceId = newPrice._id;
    }

    // === [4] Varyantlar ve Fiyatları ===
    let variantIds = [];
    if (variants && Array.isArray(variants)) {
      for (let variantData of variants) {
        let variantPriceId = null;

        if (variantData.price) {
          const newVariantPrice = new Price(variantData.price);
          await newVariantPrice.save();
          variantPriceId = newVariantPrice._id;
        }

        const variantImageIds = [];
        if (variantData.images)
          for (const imageData of variantData.images) {
            if (
              !imageData.path ||
              typeof imageData.path !== "string" ||
              !["internal", "external"].includes(imageData.type)
            ) {
              return res.status(400).json({
                success: false,
                message: "Her görsel geçerli path ve type içermelidir."
              });
            }

            const newImage = new Image({
              path: imageData.path,
              type: imageData.type,
              uploadid: imageData.uploadid,
              userid: userid // Token'dan gelen kullanıcı
            });

            await newImage.save();
            variantImageIds.push(newImage._id);
          }

        const newVariant = new Variant({
          price: variantPriceId,
          images: variantImageIds,
          attributes: variantData.attributes
        });

        await newVariant.save();
        variantIds.push(newVariant._id);
      }
    }

    // === [5] Gallery ve Image kayıtları ===
    let galleryId = null;
    if (gallery && gallery.images) {
      if (!Array.isArray(gallery.images)) {
        return res.status(400).json({ success: false, message: "Gallery.images bir dizi olmalıdır." });
      }

      const imageIds = [];
      for (const imageData of gallery.images) {
        if (
          !imageData.path ||
          typeof imageData.path !== "string" ||
          !["internal", "external"].includes(imageData.type)
        ) {
          return res.status(400).json({
            success: false,
            message: "Her görsel geçerli path ve type içermelidir."
          });
        }

        const newImage = new Image({
          path: imageData.path,
          type: imageData.type,
          uploadid: imageData.uploadid,
          userid: userid // Token'dan gelen kullanıcı
        });

        await newImage.save();
        imageIds.push(newImage._id);
      }

      const newGallery = new Gallery({
        title: gallery.title || title,
        description: gallery.description || "",
        images: imageIds
      });

      await newGallery.save();
      galleryId = newGallery._id;
    }

    // === [6] Ürün Kaydı ===
    const newProduct = new Product({
      companyid,
      title: validator.escape(title),
      meta: meta ? validator.escape(meta) : "",
      description: description || "",
      categories,
      redirectUrl: redirectUrl ? [redirectUrl] : [],
      attributes,
      basePrice: basePriceId ? [basePriceId] : [],
      variants: variantIds,
      gallery: galleryId,
      isbn,
      type,
      isOfferable,
      rentalPeriod,
      requestForm,
      vector: [] // vektör üretimi için asenkron olarak eklenecek (örn: RabbitMQ)
    });

    const nProduct = await newProduct.save();
    const vectorTextParts = [
      title,
      meta,
      description,
      categories?.join(' '),
      attributes?.map(attr => `${attr.name}: ${attr.value}`).join(' '),
    ];

    const vectorText = vectorTextParts
      .filter(Boolean)
      .map(text => text.toString().trim())
      .join(' ')
      .slice(0, 1000);

    const vectorResponse = await axios.post(process.env.EMBEDDING_URL + "/api/v10/llm/vector", { text: vectorText });

    await Product.updateOne({ _id: nProduct._id }, { vector: vectorResponse.data.vector })

    manager.incrementUsage("product", "amount", 1);
    await Account.updateOne({ _id: companyInfo.account }, { usage: account.usage });



    // === [7] Vektör Kuyruğa Gönderme ===
    // örnek bir Rabbit kuyruğuna mesaj gönderimi (hazırsa aktif et)
    // await rabbitQueue.publish("vectorize-product", {
    //   productId: newProduct._id,
    //   texts: [title, meta, description]
    // });

    return res.status(201).json({
      success: true,
      message: "Ürün başarıyla eklendi!",
      product: nProduct
    });

  } catch (error) {
    console.error("Ürün eklerken hata:", error);
    return res.status(500).json({
      success: false,
      message: "Sunucu hatası oluştu.",
      error: error.message
    });
  }
});
/**
 * @desc Belirli bir firmaya ait ürünleri listeler (pagination destekli)
 * @route GET /api/v1/products/:companyid
 * @access Private (firma kullanıcısı)
 */
const getProducts = asyncHandler(async (req, res) => {
  try {
    const { id: companyid } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if (!companyid) {
      return res.status(400).json(ApiResponse.error(400, 'Firma ID si boş olamaz.', {}));
    }

    // === [1] Token ve Kullanıcı Kontrolü ===
    const access_token = req.kauth.grant.access_token.token;
    const userInfo = await Keycloak.getUserInfo(access_token);
    const userkeyid = userInfo.sub;

    let user = await User.findOne({ keyid: userkeyid });
    if (!user) user = await new User({ keyid: userkeyid }).save();
    const userid = user._id;

    const companyInfo = await Company.findById(companyid);
    if (!companyInfo || !companyInfo.active) {
      return res.status(400).json(ApiResponse.error(400, "Firma bulunamadı veya aktif değil.", {}));
    }

    const isUserInCompany = await Company.exists({
      _id: companyid,
      "employees.userid": userid
    });

    if (!isUserInCompany) {
      return res.status(403).json(ApiResponse.error(403, "Bu firmaya erişim yetkiniz yok.", {}));
    }

    // === [2] Sayfalama Hesaplama ===
    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit);
    const skip = (pageNumber - 1) * pageSize;

    // === [3] Toplam ürün sayısı (sayfa hesaplama için) ===
    const total = await Product.countDocuments({ companyid });

    // === [4] Ürünleri çek ===
    const products = await Product.find({ companyid })
      .skip(skip)
      .limit(pageSize)
      .populate({ path: "basePrice", model: "price" })
      .populate({ path: "gallery", populate: { path: "images", model: "images" } })
      .select("-vector");

    return res.status(200).json(ApiResponse.success(200, "Ürünler başarıyla listelendi.", {
      items: products,
      pagination: {
        total,
        page: pageNumber,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    }));

  } catch (err) {
    console.error("❌ getProducts Hatası:", err);
    return res.status(500).json(ApiResponse.error(500, "Sunucu hatası.", { error: err.message }));
  }
});
/**
 * @desc Belirli bir ürünün detayını getirir
 * @route GET /api/v1/products/:companyid/:productid
 * @access Private (firma kullanıcısı)
 */
const getProductDetail = asyncHandler(async (req, res) => {
  try {
    const { id: companyid, pid: productid } = req.params;

    if (!companyid || !productid) {
      return res.status(400).json(ApiResponse.error(400, 'Firma veya Ürün ID’si eksik.', {}));
    }

    // === [1] Kullanıcı ve Token Doğrulama ===
    const access_token = req.kauth.grant.access_token.token;
    const userInfo = await Keycloak.getUserInfo(access_token);
    const userkeyid = userInfo.sub;

    let user = await User.findOne({ keyid: userkeyid });
    if (!user) user = await new User({ keyid: userkeyid }).save();
    const userid = user._id;

    // === [2] Firma geçerli mi ve kullanıcı yetkili mi? ===
    const companyInfo = await Company.findById(companyid);
    if (!companyInfo || !companyInfo.active) {
      return res.status(400).json(ApiResponse.error(400, "Firma bulunamadı veya aktif değil.", {}));
    }

    const isUserInCompany = await Company.exists({
      _id: companyid,
      "employees.userid": userid
    });

    if (!isUserInCompany) {
      return res.status(403).json(ApiResponse.error(403, "Bu firmaya erişim yetkiniz yok.", {}));
    }

    // === [3] Ürün Detayını Getir ===
    const product = await Product.findOne({
      _id: productid,
      companyid: companyid
    })
      .populate({ path: "basePrice", model: "price" })
      .populate({ path: "gallery", populate: { path: "images", model: "images" } })
      .populate({ path: "variants", model: "variants" })
      .populate({ path: "requestForm", model: "dynamicform" })
      .select("-vector");

    if (!product) {
      return res.status(404).json(ApiResponse.error(404, "Ürün bulunamadı.", {}));
    }

    return res.status(200).json(ApiResponse.success(200, "Ürün detayı başarıyla getirildi.", product));

  } catch (err) {
    console.error("❌ getProductDetail Hatası:", err);
    return res.status(500).json(ApiResponse.error(500, "Sunucu hatası.", { error: err.message }));
  }
});
/**
 * @desc Ürünün temel bilgilerini getirir (alt kırılımlar hariç)
 * @route GET /api/v1/products/:companyid/:productid
 * @access Private (firma kullanıcısı)
 */
const getProductBase = asyncHandler(async (req, res) => {
  try {
    const { id: companyid, pid: productid } = req.params;

    if (!companyid || !productid) {
      return res.status(400).json(ApiResponse.error(400, "Firma veya Ürün ID’si eksik.", {}));
    }

    // === [1] Kullanıcı doğrulama ===
    const access_token = req.kauth.grant.access_token.token;
    const userInfo = await Keycloak.getUserInfo(access_token);
    const userkeyid = userInfo.sub;

    let user = await User.findOne({ keyid: userkeyid });
    if (!user) user = await new User({ keyid: userkeyid }).save();
    const userid = user._id;

    // === [2] Firma ve erişim kontrolü ===
    const isUserInCompany = await Company.exists({
      _id: companyid,
      "employees.userid": userid,
    });

    if (!isUserInCompany) {
      return res.status(403).json(ApiResponse.error(403, "Bu firmaya erişim yetkiniz yok.", {}));
    }

    // === [3] Ürünü getir ===
    const product = await Product.findOne(
      { _id: productid, companyid: companyid },
      {
        title: 1,
        meta: 1,
        description: 1,
        categories: 1,
        redirectUrl: 1,
        isbn: 1,
        type: 1,
        pricetype: 1,
        attributes: 1,
        createdAt: 1,
        updatedAt: 1
      }
    );

    if (!product) {
      return res.status(404).json(ApiResponse.error(404, "Ürün bulunamadı.", {}));
    }

    return res.status(200).json(ApiResponse.success(200, "Ürün bilgisi alındı.", product));
  } catch (err) {
    console.error("❌ getProductBase Hatası:", err);
    return res.status(500).json(ApiResponse.error(500, "Sunucu hatası.", { error: err.message }));
  }
});

/**
 * @desc Ürünün temel fiyat bilgisini getirir (Price modeli üzerinden)
 * @route GET /api/v1/products/:companyid/:productid/base-price
 * @access Private (firma kullanıcısı)
 */
const getProductBasePrice = asyncHandler(async (req, res) => {
  try {
    const { id: companyid, pid: productid } = req.params;

    if (!companyid || !productid) {
      return res.status(400).json(ApiResponse.error(400, "Firma veya Ürün ID’si eksik.", {}));
    }

    // === [1] Kullanıcı Doğrulama ===
    const access_token = req.kauth.grant.access_token.token;
    const userInfo = await Keycloak.getUserInfo(access_token);
    const userkeyid = userInfo.sub;

    let user = await User.findOne({ keyid: userkeyid });
    if (!user) user = await new User({ keyid: userkeyid }).save();
    const userid = user._id;

    // === [2] Firma ve Erişim Kontrolü ===
    const isUserInCompany = await Company.exists({
      _id: companyid,
      "employees.userid": userid,
    });

    if (!isUserInCompany) {
      return res.status(403).json(ApiResponse.error(403, "Bu firmaya erişim yetkiniz yok.", {}));
    }

    // === [3] Ürünü ve Fiyat Bilgisini Getir ===
    const product = await Product.findOne({ _id: productid, companyid })
      .populate("basePrice");

    if (!product || !product.basePrice || product.basePrice.length === 0) {
      return res.status(404).json(ApiResponse.error(404, "Temel fiyat bilgisi bulunamadı.", {}));
    }

    return res.status(200).json(ApiResponse.success(200, "Temel fiyat bilgisi getirildi.", product.basePrice));
  } catch (err) {
    console.error("❌ getProductBasePrice Hatası:", err);
    return res.status(500).json(ApiResponse.error(500, "Sunucu hatası.", { error: err.message }));
  }
});
/**
 * @desc Ürünün galerisini ve görsellerini getirir
 * @route GET /api/v1/products/:companyid/:productid/gallery
 * @access Private (firma kullanıcısı)
 */
const getProductGallery = asyncHandler(async (req, res) => {
  try {
    const { id: companyid, pid: productid } = req.params;

    if (!companyid || !productid) {
      return res.status(400).json(ApiResponse.error(400, "Firma veya Ürün ID’si eksik.", {}));
    }

    // === [1] Kullanıcı Doğrulama ===
    const access_token = req.kauth.grant.access_token.token;
    const userInfo = await Keycloak.getUserInfo(access_token);
    const userkeyid = userInfo.sub;

    let user = await User.findOne({ keyid: userkeyid });
    if (!user) user = await new User({ keyid: userkeyid }).save();
    const userid = user._id;

    // === [2] Firma Erişim Kontrolü ===
    const isUserInCompany = await Company.exists({
      _id: companyid,
      "employees.userid": userid
    });

    if (!isUserInCompany) {
      return res.status(403).json(ApiResponse.error(403, "Bu firmaya erişim yetkiniz yok.", {}));
    }

    // === [3] Ürünü Galeriyle Birlikte Getir ===
    const product = await Product.findOne({ _id: productid, companyid })
      .populate({
        path: "gallery",
        populate: { path: "images" }
      });

    if (!product || !product.gallery) {
      return res.status(404).json(ApiResponse.error(404, "Galeri bilgisi bulunamadı.", {}));
    }

    return res.status(200).json(ApiResponse.success(200, "Galeri bilgisi getirildi.", product.gallery));
  } catch (err) {
    console.error("❌ getProductGallery Hatası:", err);
    return res.status(500).json(ApiResponse.error(500, "Sunucu hatası.", { error: err.message }));
  }
});
/**
 * @desc Ürüne ait varyantları getirir (alt alanlar dahil)
 * @route GET /api/v1/products/:companyid/:productid/variants
 * @access Private (firma kullanıcısı)
 */
const getProductVariants = asyncHandler(async (req, res) => {
  try {
    const { id: companyid, pid: productid } = req.params;

    if (!companyid || !productid) {
      return res.status(400).json(ApiResponse.error(400, "Firma veya Ürün ID’si eksik.", {}));
    }

    // === [1] Kullanıcı doğrulama ===
    const access_token = req.kauth.grant.access_token.token;
    const userInfo = await Keycloak.getUserInfo(access_token);
    const userkeyid = userInfo.sub;

    let user = await User.findOne({ keyid: userkeyid });
    if (!user) user = await new User({ keyid: userkeyid }).save();
    const userid = user._id;

    // === [2] Firma erişim kontrolü ===
    const isUserInCompany = await Company.exists({
      _id: companyid,
      "employees.userid": userid
    });

    if (!isUserInCompany) {
      return res.status(403).json(ApiResponse.error(403, "Bu firmaya erişim yetkiniz yok.", {}));
    }

    // === [3] Ürünü varyantlarıyla ve alt alanlarıyla getir ===
    const product = await Product.findOne({ _id: productid, companyid })
      .populate({
        path: "variants",
        populate: [
          { path: "price" },        // varyant fiyat bilgisi
          { path: "images" }        // varyanta ait görseller
        ]
      });

    if (!product) {
      return res.status(404).json(ApiResponse.error(404, "Ürün bulunamadı.", {}));
    }

    return res.status(200).json(ApiResponse.success(200, "Varyantlar getirildi.", product.variants));
  } catch (err) {
    console.error("❌ getProductVariants Hatası:", err);
    return res.status(500).json(ApiResponse.error(500, "Sunucu hatası.", { error: err.message }));
  }
});
/**
 * @desc Ürünün ana alanlarını günceller (alt kırılımlar hariç)
 * @route PUT /api/v1/products/:companyid/:productid
 * @access Private (firma kullanıcısı)
 */
const updateProduct = asyncHandler(async (req, res) => {
  try {
    const { id: companyid, pid: productid } = req.params;
    const {
      title,
      meta,
      description,
      categories,
      redirectUrl,
      isbn,
      type,
      priceType,
      isOfferable,
      rentalPeriod,
      attributes
    } = req.body;
    console.log("req.body", req.body)

    if (!companyid || !productid) {
      return res.status(400).json(ApiResponse.error(400, "Firma veya Ürün ID’si eksik.", {}));
    }

    // === [1] Kullanıcı Doğrulama ===
    const access_token = req.kauth.grant.access_token.token;
    const userInfo = await Keycloak.getUserInfo(access_token);
    const userkeyid = userInfo.sub;

    let user = await User.findOne({ keyid: userkeyid });
    if (!user) user = await new User({ keyid: userkeyid }).save();
    const userid = user._id;

    // === [2] Firma ve Kullanıcı Erişim Kontrolü ===
    const isUserInCompany = await Company.exists({
      _id: companyid,
      "employees.userid": userid
    });

    if (!isUserInCompany) {
      return res.status(403).json(ApiResponse.error(403, "Bu firmaya erişim yetkiniz yok.", {}));
    }

    // === [3] Ürün Var mı? ===
    const product = await Product.findOne({ _id: productid, companyid: companyid });
    if (!product) {
      return res.status(404).json(ApiResponse.error(404, "Ürün bulunamadı.", {}));
    }

    // === [4] Güncelleme ===
    if (title) product.title = validator.escape(title);
    if (meta) product.meta = validator.escape(meta);
    if (description) product.description = description;
    if (Array.isArray(categories)) product.categories = categories;

    if (redirectUrl !== undefined) {
      if (!Array.isArray(redirectUrl)) {
        return res.status(400).json(ApiResponse.error(400, "redirectUrl bir dizi olmalıdır.", {}));
      }

      const allValid = redirectUrl.every(url => typeof url === "string" && validator.isURL(url));

      if (!allValid) {
        return res.status(400).json(ApiResponse.error(400, "Tüm redirectUrl elemanları geçerli bir URL olmalıdır.", {}));
      }

      product.redirectUrl = redirectUrl;

    }
    if (isbn) product.isbn = isbn;
    product.type = type
    if (priceType && ["fixed", "rental", "offer_based"].includes(priceType)) {
      product.pricetype = priceType;
    }
    if (typeof isOfferable === "boolean") product.isOfferable = isOfferable;
    if (rentalPeriod) product.rentalPeriod = rentalPeriod;
    // ✅ Yeni: attributes güncellemesi
    if (Array.isArray(attributes) && attributes.length > 0) {
      const validAttributes = attributes.filter(attr =>
        typeof attr.name === "string" &&
        typeof attr.value === "string"
      );
      product.attributes = validAttributes;
    }
    await product.save();
    delete product.vector;
    return res.status(200).json(ApiResponse.success(200, "Ürün başarıyla güncellendi.", product));

  } catch (err) {
    console.error("❌ updateProduct Hatası:", err);
    return res.status(500).json(ApiResponse.error(500, "Sunucu hatası.", { error: err.message }));
  }
});
/**
 * @desc Ürüne ait varyantları günceller (eski varyantları siler, yenileri kaydeder)
 * @route PUT /api/v1/products/:companyid/:productid/variants
 * @access Private (firma kullanıcısı)
 */
const updateProductVariants = asyncHandler(async (req, res) => {
  const { id: companyid, pid: productid } = req.params;
  const { variants } = req.body;

  if (!Array.isArray(variants)) {
    return res.status(400).json(ApiResponse.error(400, "Variants dizisi gönderilmelidir.", {}));
  }

  // Yetkilendirme
  const access_token = req.kauth.grant.access_token.token;
  const userInfo = await Keycloak.getUserInfo(access_token);
  const userkeyid = userInfo.sub;

  const user = await User.findOne({ keyid: userkeyid });
  const isUserInCompany = await Company.exists({
    _id: companyid,
    "employees.userid": user._id
  });

  if (!isUserInCompany) {
    return res.status(403).json(ApiResponse.error(403, "Yetkisiz erişim.", {}));
  }

  // Ürün kontrolü
  const product = await Product.findOne({ _id: productid, companyid });
  if (!product) {
    return res.status(404).json(ApiResponse.error(404, "Ürün bulunamadı.", {}));
  }

  // Eski varyantları sil
  await Variant.deleteMany({ _id: { $in: product.variants } });

  // Yeni varyantları ekle
  const newVariantIds = [];
  for (const variantData of variants) {
    const newVariant = new Variant(variantData);
    await newVariant.save();
    newVariantIds.push(newVariant._id);
  }

  // Ürünü güncelle
  product.variants = newVariantIds;
  await product.save();

  return res.status(200).json(ApiResponse.success(200, "Varyantlar güncellendi.", newVariantIds));
});
/**
 * @desc Ürünün galerisini ve görsellerini günceller (yeni galeri oluşturur, eskiyi değiştirir)
 * @route PUT /api/v1/products/:companyid/:productid/gallery
 * @access Private (firma kullanıcısı)
 */
const updateProductGallery = asyncHandler(async (req, res) => {
  const { id: companyid, pid: productid } = req.params;
  const { gallery } = req.body;

  // Kullanıcı doğrulama
  const access_token = req.kauth.grant.access_token.token;
  const userInfo = await Keycloak.getUserInfo(access_token);
  const userkeyid = userInfo.sub;
  const user = await User.findOne({ keyid: userkeyid });

  const isUserInCompany = await Company.exists({
    _id: companyid,
    "employees.userid": user._id
  });

  if (!isUserInCompany) {
    return res.status(403).json(ApiResponse.error(403, "Yetkisiz erişim.", {}));
  }

  // Validasyon
  if (!gallery || !Array.isArray(gallery.images) || gallery.images.length === 0) {
    return res.status(400).json(ApiResponse.error(400, "Gallery.images boş olamaz.", {}));
  }

  const imageIds = [];
  for (const image of gallery.images) {
    const { uploadid, path, type } = image;

    if (!uploadid || !path) {
      continue; // eksik olanları atla
    }

    const newImage = new Image({
      uploadid,
      path,
      type: type || "internal"
    });

    await newImage.save();
    imageIds.push(newImage._id);
  }

  const newGallery = new Gallery({
    title: gallery.title || "Ürün Galerisi",
    description: gallery.description || "",
    images: imageIds
  });

  await newGallery.save();

  const updatedProduct = await Product.findOneAndUpdate(
    { _id: productid, companyid },
    { gallery: newGallery._id },
    { new: true }
  );

  if (!updatedProduct) {
    return res.status(404).json(ApiResponse.error(404, "Ürün bulunamadı.", {}));
  }

  return res.status(200).json(ApiResponse.success(200, "Galeri başarıyla güncellendi.", newGallery));
});
/**
 * @desc Ürünün talep formunu günceller
 * @route PUT /api/v1/products/:companyid/:productid/request-form
 * @access Private (firma kullanıcısı)
 */
const updateProductRequestForm = asyncHandler(async (req, res) => {
  const { id: companyid, pid: productid, fid: formid } = req.params;

  if (!formid) {
    return res.status(400).json(ApiResponse.error(400, "requestFormId zorunludur.", {}));
  }

  await Product.updateOne({ _id: productid, companyid }, { requestForm: formid });

  return res.status(200).json(ApiResponse.success(200, "Request form güncellendi.", {}));
});
/**
 * @desc Ürüne yeni fiyat ekler (price history)
 * @route POST /api/v1/products/:companyid/:productid/base-price
 * @access Private (firma kullanıcısı)
 */
const updateProductBasePrice = asyncHandler(async (req, res) => {
  const { id: companyid, pid: productid } = req.params;
  let { _id, currency, discountRate, originalPrice } = req.body;

  const access_token = req.kauth.grant.access_token.token;
  const userInfo = await Keycloak.getUserInfo(access_token);
  const userkeyid = userInfo.sub;

  const user = await User.findOne({ keyid: userkeyid });
  const isUserInCompany = await Company.exists({
    _id: companyid,
    "employees.userid": user._id
  });

  if (!isUserInCompany) {
    return res.status(403).json(ApiResponse.error(403, "Yetkisiz erişim.", {}));
  }

  if (!["TL", "DL"].includes(currency)) {
    return res.status(400).json(ApiResponse.error(400, "Geçerli para birimi seçilmelidir.", {}));
  }

  if (discountRate && typeof discountRate !== "number") {
    discountRate = 0;
  }

  let savedPrice;
  let operation;

  if (_id) {
    // 🔁 GÜNCELLE
    const updated = await Price.findByIdAndUpdate(
      _id,
      { currency, discountRate, originalPrice },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json(ApiResponse.error(404, "Fiyat kaydı bulunamadı.", {}));
    }

    savedPrice = updated;
    operation = "update";

  } else {
    // ➕ YENİ EKLE
    const newPrice = new Price({ currency, discountRate, originalPrice });
    await newPrice.save();

    await Product.updateOne(
      { _id: productid, companyid },
      { $push: { basePrice: newPrice._id } }
    );

    savedPrice = newPrice;
    operation = "create";
  }

  return res
    .status(200)
    .json(ApiResponse.success(200, `Fiyat ${operation === "update" ? "güncellendi" : "eklendi"}.`, savedPrice));
});

/**
 * @desc Ürünü siler (alt verileri elle silmek gerekir)
 * @route DELETE /api/v1/products/:companyid/:productid
 * @access Private (firma kullanıcısı)
 */
const deleteProduct = asyncHandler(async (req, res) => {
  const { id: companyid, pid: productid } = req.params;

  const access_token = req.kauth.grant.access_token.token;
  const userInfo = await Keycloak.getUserInfo(access_token);
  const userkeyid = userInfo.sub;

  let user = await User.findOne({ keyid: userkeyid });
  if (!user) user = await new User({ keyid: userkeyid }).save();

  const isUserInCompany = await Company.exists({
    _id: companyid,
    "employees.userid": user._id
  });
  if (!isUserInCompany) {
    return res.status(403).json(ApiResponse.error(403, "Erişim yetkiniz yok.", {}));
  }

  const product = await Product.findOne({ _id: productid, companyid });
  if (!product) {
    return res.status(404).json(ApiResponse.error(404, "Ürün bulunamadı.", {}));
  }

  // Alt veriler daha sonra ayrıca silinir
  await Product.deleteOne({ _id: productid });

  return res.status(200).json(ApiResponse.success(200, "Ürün silindi."));
});
/**
 * @desc Ürünün temel fiyat bilgisini siler
 * @route DELETE /api/v1/products/:companyid/:productid/base-price
 * @access Private (firma kullanıcısı)
 */
const deleteProductBasePrice = asyncHandler(async (req, res) => {
  const { id: companyid, pid: productid } = req.params;

  const product = await Product.findOne({ _id: productid, companyid });
  if (!product || !product.basePrice || product.basePrice.length === 0) {
    return res.status(404).json(ApiResponse.error(404, "BasePrice bulunamadı.", {}));
  }

  await Price.deleteMany({ _id: { $in: product.basePrice } });
  await Product.updateOne({ _id: productid }, { basePrice: [] });

  return res.status(200).json(ApiResponse.success(200, "BasePrice silindi."));
});

/**
 * @desc Ürünün fiyatlarından ilgili id'yi siler ve ürün basePrice alanındaki referansı kaldırır
 * @route DELETE /api/v1/products/base-price/:companyid/:productid/:priceid
 * @access Private (firma kullanıcısı)
 */
const deleteProductBasePriceItem = asyncHandler(async (req, res) => {
  const { id: companyid, pid: productid, prid: priceid } = req.params;

  const product = await Product.findOne({ _id: productid, companyid });
  if (!product || !product.basePrice || product.basePrice.length === 0) {
    return res.status(404).json(ApiResponse.error(404, "BasePrice bulunamadı.", {}));
  }

  // Fiyatı sil
  await Price.deleteOne({ _id: priceid });

  // Product.basePrice alanındaki ilgili priceid'yi kaldır
  await Product.updateOne({ _id: productid }, { $pull: { basePrice: priceid } });

  return res.status(200).json(ApiResponse.success(200, "BasePrice silindi.", { priceid }));
});
/**
 * @desc Ürüne ait varyantları siler
 * @route DELETE /api/v1/products/:companyid/:productid/variants
 * @access Private (firma kullanıcısı)
 */
const deleteProductVariants = asyncHandler(async (req, res) => {
  const { id: companyid, pid: productid } = req.params;

  const product = await Product.findOne({ _id: productid, companyid });
  if (!product || !product.variants || product.variants.length === 0) {
    return res.status(404).json(ApiResponse.error(404, "Varyantlar bulunamadı.", {}));
  }

  await Variant.deleteMany({ _id: { $in: product.variants } });
  await Product.updateOne({ _id: productid }, { variants: [] });

  return res.status(200).json(ApiResponse.success(200, "Varyantlar silindi."));
});
/**
 * @desc Ürünün galeri ve görsellerini siler
 * @route DELETE /api/v1/products/:companyid/:productid/gallery
 * @access Private (firma kullanıcısı)
 */
const deleteProductGallery = asyncHandler(async (req, res) => {
  const { id: companyid, pid: productid } = req.params;

  const product = await Product.findOne({ _id: productid, companyid }).populate({
    path: "gallery",
    populate: { path: "images" }
  });

  if (!product || !product.gallery) {
    return res.status(404).json(ApiResponse.error(404, "Galeri bulunamadı.", {}));
  }

  const imageIds = product.gallery.images?.map(img => img._id) || [];

  await Image.deleteMany({ _id: { $in: imageIds } });
  await Gallery.deleteOne({ _id: product.gallery._id });

  await Product.updateOne({ _id: productid }, { gallery: null });

  return res.status(200).json(ApiResponse.success(200, "Galeri ve resimler silindi."));
});
/**
 * @desc Ürünün bağlı olduğu request formu siler
 * @route DELETE /api/v1/products/:companyid/:productid/request-form
 * @access Private (firma kullanıcısı)
 */
const deleteProductRequestForm = asyncHandler(async (req, res) => {
  const { id: companyid, pid: productid } = req.params;

  const product = await Product.findOne({ _id: productid, companyid });
  if (!product || !product.requestForm) {
    return res.status(404).json(ApiResponse.error(404, "RequestForm bulunamadı.", {}));
  }

  await DynamicForm.deleteOne({ _id: product.requestForm });
  await Product.updateOne({ _id: productid }, { requestForm: null });

  return res.status(200).json(ApiResponse.success(200, "RequestForm silindi."));
});
/**
 * @desc Galerideki belirli bir görseli siler
 * @route DELETE /api/v10/products/:companyid/:productid/gallery/image/:imageid
 * @access Private (firma kullanıcısı)
 */
const deleteImageFromGallery = asyncHandler(async (req, res) => {
  const { id: companyid, pid: productid, imageid: imageid } = req.params;
  const product = await Product.findOne({ _id: productid, companyid }).populate({
    path: "gallery",
    populate: { path: "images" }
  });

  if (!product || !product.gallery) {
    return res.status(404).json(ApiResponse.error(404, "Galeri bulunamadı.", {}));
  }

  const image = product.gallery.images.find(img => img._id.toString() === imageid);
  if (!image) {
    return res.status(404).json(ApiResponse.error(404, "Görsel bu galeriye ait değil.", {}));
  }

  // Eğer internal ise dosya sisteminden/s3'ten de sil
  /*  if (image.type === "internal" && image.path) {
     try {
       await imageService.deleteFromStorage(image.path);
     } catch (err) {
       console.warn(`⚠️ Görsel S3'ten silinemedi: ${image.path}`, err.message);
     }
   } */

  // Görseli DB'den sil
  await Image.deleteOne({ _id: imageid });

  // Gallery içinden referansı çıkar
  await Gallery.updateOne(
    { _id: product.gallery._id },
    { $pull: { images: imageid } }
  );

  return res.status(200).json(ApiResponse.success(200, "Görsel galeriden silindi.", { imageid }));
});
module.exports = {
  getProducts, addProduct, getProductDetail, getProductBase, deleteProductRequestForm, getProductVariants,
  deleteProductGallery, deleteProductVariants, deleteProductBasePrice, deleteProductBasePriceItem, getProductGallery,
  deleteProduct, deleteImageFromGallery, getProductBasePrice, updateProductBasePrice,
  updateProductGallery, updateProductVariants, updateProduct, updateProductRequestForm
};

