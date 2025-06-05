
const asyncHandler = require("express-async-handler");
const axios = require("axios");
const ApiResponse = require("../helpers/response.js")
const Keycloak = require("../lib/Keycloak.js");
const OfferRequest = require("../mongoModels/offerRequestModel.js")
const OfferResponse = require("../mongoModels/offerReponseModel.js")
const DynamicForm = require("../mongoModels/dynamicFormModel.js")
const formfield = require("../mongoModels/formFieldModel.js")
const FormResponse = require("../mongoModels/formResponseModel.js")
const ProductsDB = require("../db/ProductsDB.js");
const FormFieldsDB = require("../db/FormFieldsDB.js");
const Products = require("../mongoModels/productsModel.js");

const User = require("../mongoModels/userModel.js")

const FindFormFieldQuestionAgent = require("../llm/agents/findFormFieldQuestionAgent.js")
const { sendOfferRequestEmail, sendOfferCompleteEmail,sendOfferResponseEmail } = require("../jobs/sendEmail.js");
const { ProductSearchTool } = require("../llm/tools/ProductSearchTool.js");

const AccountManager = require("../helpers/AccountManager.js");
const { trace } = require("joi");
const companyProfilModel = require("../mongoModels/companyProfilModel.js");
const { handleInsert, handleUpdateOne } = require("../services/dbQueryService.js")

async function updateOfferRequestState(offerRequestId, newState) {
  handleUpdateOne("offerrequest", { _id: offerRequestId }, {
    state: newState,
    $push: {
      stateHistory: {
        step: newState,
        updatedAt: new Date()
      }
    }
  });
}
const makeform = asyncHandler(async (req, res) => {
  const { offerRequestId } = req.body;

  try {
    const access_token = req.kauth?.grant?.access_token?.token;
    if (!access_token) {
      return res.status(401).json(ApiResponse.error(401, "Yetkilendirme hatası", {
        message: "Token bulunamadı veya geçersiz."
      }));
    }

    // [1] Keycloak Kullanıcı Doğrulama
    const userkey = await Keycloak.getUserInfo(access_token);
    const user = await User.findOne({ keyid: userkey.sub });
    if (!user) {
      return res.status(404).json(ApiResponse.error(404, "Kullanıcı bulunamadı"));
    }

    // [2] Input Validation – offerRequestId doğrulama
    if (!offerRequestId || typeof offerRequestId !== "string") {
      return res.status(400).json(ApiResponse.error(400, "Geçersiz parametre", {
        message: "Teklif ID değeri eksik veya hatalı"
      }));
    }

    // [3] OfferRequest çekme
    const offerRequest = await OfferRequest.findById(offerRequestId);
    if (!offerRequest) {
      return res.status(404).json(ApiResponse.error(404, "Teklif isteği bulunamadı"));
    }

    // [4] Sahiplik kontrolü
    if (!offerRequest.userid.equals(user._id)) {
      return res.status(403).json(ApiResponse.error(403, "Bu teklif isteğine erişiminiz yok"));
    }

    // [5] İkinci kez form oluşturulması engellenmeli
    if (offerRequest.dynamicFormId) {
      return res.status(400).json(ApiResponse.error(400, "Bu teklif için form zaten oluşturulmuş", {
        formid: offerRequest.dynamicFormId
      }));
    }

    const fieldDB = new FormFieldsDB();
    const targetProductIds = offerRequest.targetProductId || [];

    if (!Array.isArray(targetProductIds) || targetProductIds.length === 0) {
      return res.status(400).json(ApiResponse.error(400, "Teklif için geçerli ürün bulunamadı"));
    }

    // [6] FormField vektör eşleştirme
    const questionAgent = new FindFormFieldQuestionAgent();
    await questionAgent.start();
    const questions = await questionAgent.create(offerRequest.description);

    const matchedFieldIds = [];

    for (const q of questions) {
      const text = q.question.slice(0, 1000);
      const vectorRes = await axios.post(`${process.env.EMBEDDING_URL}/api/v10/llm/vector`, { text });

      if (!vectorRes?.data?.vector || !Array.isArray(vectorRes.data.vector)) {
        continue; // geçersiz vektör
      }

      const vector = vectorRes.data.vector;

      const bestMatchList = await fieldDB.searchVector(vector, 3, {
        productid: { $in: targetProductIds.map(id => new mongoose.Types.ObjectId(id)) }
      });

      for (const match of bestMatchList) {
        const fieldIdStr = match._id.toString();
        if (!matchedFieldIds.includes(fieldIdStr)) {
          matchedFieldIds.push(fieldIdStr);
        }
      }
    }

    if (matchedFieldIds.length === 0) {
      return res.status(404).json(ApiResponse.error(404, "Uygun form alanı bulunamadı"));
    }
    // Eğer targetCompanyId boşsa, targetProductId üzerinden toplanır
    if (!offerRequest.targetCompanyId || offerRequest.targetCompanyId.length === 0) {
      const productDb = new ProductsDB();
      const products = await productDb.read({ _id: { $in: targetProductIds } }, { companyid: 1 });
      const companyIds = [...new Set(products.map(p => p.companyid?.toString()).filter(Boolean))];
      offerRequest.targetCompanyId = companyIds;
    }

    const dynamicForm = await DynamicForm.create({
      companyid: null,
      formName: "Otomatik Form",
      description: "AI tarafından oluşturulmuştur",
      whom: user._id,
      fields: matchedFieldIds
    });

    offerRequest.dynamicFormId = dynamicForm._id;
    await offerRequest.save();

    const populatedForm = await DynamicForm.findById(dynamicForm._id)
      .populate({ path: "fields", model: "formfield", select: "-vector" });

    await updateOfferRequestState(offerRequestId, "makeform");

    return res.status(200).json(ApiResponse.success(200, "Form başarıyla oluşturuldu", {
      offerRequestId: offerRequest._id,
      formid: dynamicForm._id,
      fields: populatedForm.fields
    }));

  } catch (error) {
    console.error("Teklif Formu Hatası:", error);
    return res.status(500).json(ApiResponse.error(500, "Sunucu hatası", {
      error: error.message
    }));
  }
});
const makeFormFromProducts = asyncHandler(async (req, res) => {
  const { description, productIds } = req.body;

  try {
    const access_token = req.kauth?.grant?.access_token?.token;
    if (!access_token) {
      return res.status(401).json(ApiResponse.error(401, "Yetkilendirme hatası", {
        message: "Token bulunamadı veya geçersiz."
      }));
    }

    const userkey = await Keycloak.getUserInfo(access_token);
    const user = await User.findOne({ keyid: userkey.sub });
    if (!user) {
      return res.status(404).json(ApiResponse.error(404, "Kullanıcı bulunamadı"));
    }

    // === [1] Girdi Kontrolleri
    if (!description || typeof description !== "string") {
      return res.status(400).json(ApiResponse.error(400, "Eksik açıklama"));
    }

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json(ApiResponse.error(400, "Geçerli bir ürün listesi girilmelidir"));
    }

    const objectProductIds = productIds.map(id => new mongoose.Types.ObjectId(id));

    // === [2] Eşleşen şirketleri al
    const products = await Product.find({ _id: { $in: objectProductIds } }, { companyid: 1 });
    const uniqueCompanyIds = [...new Set(products.map(p => p.companyid?.toString()).filter(Boolean))];

    const fieldDB = new FormFieldsDB();
    const questionAgent = new FindFormFieldQuestionAgent();
    await questionAgent.start();
    const questions = await questionAgent.create(description);

    const matchedFieldIds = [];

    for (const q of questions) {
      const text = q.question.slice(0, 1000);
      const vectorRes = await axios.post(`${process.env.EMBEDDING_URL}/api/v10/llm/vector`, { text });

      if (!vectorRes?.data?.vector || !Array.isArray(vectorRes.data.vector)) continue;

      const vector = vectorRes.data.vector;

      const bestMatchList = await fieldDB.searchVector(vector, 3, {
        productid: { $in: objectProductIds }
      });

      for (const match of bestMatchList) {
        const fieldIdStr = match._id.toString();
        if (!matchedFieldIds.includes(fieldIdStr)) {
          matchedFieldIds.push(fieldIdStr);
        }
      }
    }

    if (matchedFieldIds.length === 0) {
      return res.status(404).json(ApiResponse.error(404, "Uygun form alanı bulunamadı"));
    }

    // === [3] Yeni Form Oluştur
    const dynamicForm = await DynamicForm.create({
      companyid: null,
      formName: "Otomatik Genel Form",
      description: "AI tarafından oluşturulmuştur",
      whom: user._id,
      fields: matchedFieldIds
    });

    // === [4] Yeni Teklif Kaydı Oluştur
    const offerRequest = await new OfferRequest({
      userid: user._id,
      productid: null,
      description: description,
      isGeneral: true,
      dynamicFormId: dynamicForm._id,
      targetProductId: objectProductIds,
      targetCompanyId: uniqueCompanyIds,
      offerDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      notificationStatus: "pending"
    }).save();

    const populatedForm = await DynamicForm.findById(dynamicForm._id)
      .populate({ path: "fields", model: "formfield", select: "-vector" });

    await updateOfferRequestState(offerRequest._id, "makeform");

    return res.status(200).json(ApiResponse.success(200, "Form başarıyla oluşturuldu", {
      offerRequestId: offerRequest._id,
      formid: dynamicForm._id,
      fields: populatedForm.fields
    }));

  } catch (error) {
    console.error("Genel Teklif Formu Hatası:", error);
    return res.status(500).json(ApiResponse.error(500, "Sunucu hatası", {
      error: error.message
    }));
  }
});
const saveFormResponse = asyncHandler(async (req, res) => {
  const { offerRequestId, formId, answers } = req.body;

  if (!offerRequestId || !formId || !Array.isArray(answers)) {
    return res.status(400).json(ApiResponse.error(400, "Eksik parametre", {
      message: "offerRequestId, formId ve answers gereklidir."
    }));
  }

  try {
    // === [1] Token & Kullanıcı doğrulama ===
    const access_token = req.kauth?.grant?.access_token?.token;
    if (!access_token) {
      return res.status(401).json(ApiResponse.error(401, "Yetkilendirme hatası", {
        message: "Token bulunamadı veya geçersiz."
      }));
    }

    const userKey = await Keycloak.getUserInfo(access_token);
    const user = await User.findOne({ keyid: userKey.sub });
    if (!user) {
      return res.status(404).json(ApiResponse.error(404, "Kullanıcı bulunamadı"));
    }

    // === [2] Teklif isteği doğrulama ===
    const offerRequest = await OfferRequest.findById(offerRequestId);
    if (!offerRequest) {
      return res.status(404).json(ApiResponse.error(404, "Teklif isteği bulunamadı"));
    }

    if (!offerRequest.userid.equals(user._id)) {
      return res.status(403).json(ApiResponse.error(403, "Bu teklif isteği size ait değil"));
    }

    if (["closed", "canceled"].includes(offerRequest.status)) {
      return res.status(403).json(ApiResponse.error(403, "Bu teklif için artık form doldurulamaz."));
    }

    if (["answerform", "generalinfo", "completed"].includes(offerRequest.state)) {
      return res.status(403).json(ApiResponse.error(403, "Bu form soru cevaplama aşamasını geçmiş."));
    }

    // === [3] Form ve field'ları kontrol et ===
    const form = await DynamicForm.findById(formId).populate({
      path: "fields",
      model: "formfield"
    });

    if (!form) {
      return res.status(404).json(ApiResponse.error(404, "Form bulunamadı"));
    }

    const fieldMap = new Map(form.fields.map(field => [field._id.toString(), field]));

    const existingResponses = await FormResponse.find({
      offerRequestId,
      formId,
      fieldId: { $in: answers.map(a => a.fieldId) }
    });

    const alreadyAnsweredFieldIds = new Set(existingResponses.map(r => r.fieldId.toString()));

    const responses = answers.map(({ fieldId, value }) => {
      const field = fieldMap.get(fieldId);
      if (!field || alreadyAnsweredFieldIds.has(fieldId)) return null;

      let isValid = true;
      let validationMessage = "";

      if (field.required && (value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0))) {
        isValid = false;
        validationMessage = "Bu alan zorunludur.";
      }

      if (field.validation?.minLength && typeof value === "string" && value.length < field.validation.minLength) {
        isValid = false;
        validationMessage = `En az ${field.validation.minLength} karakter girilmelidir.`;
      }

      return {
        offerRequestId,
        formId,
        fieldId,
        answer: value,
        isValid,
        validationMessage
      };
    }).filter(Boolean);

    if (responses.length === 0) {
      return res.status(409).json(ApiResponse.error(409, "Zaten cevaplanmış alanlar, tekrar doldurulamaz"));
    }

    await FormResponse.insertMany(responses);
    await updateOfferRequestState(offerRequestId, "answerform");

    return res.status(200).json(ApiResponse.success(200, "Form cevapları kaydedildi", {
      offerRequestId,
      formId,
      saved: responses.length
    }));

  } catch (err) {
    console.error("Form kaydetme hatası:", err);
    return res.status(500).json(ApiResponse.error(500, "Sunucu hatası", { error: err.message }));
  }
});
const search = asyncHandler(async (req, res) => {
  const { description } = req.body;

  if (!description) {
    return res.status(400).json(ApiResponse.error(400, "Eksik parametre", {
      message: "description gereklidir."
    }));
  }

  try {
    // === [1] Token kontrolü ===
    const access_token = req.kauth?.grant?.access_token?.token;
    if (!access_token) {
      return res.status(401).json(ApiResponse.error(401, "Yetkilendirme hatası", {
        message: "Token bulunamadı veya geçersiz."
      }));
    }

    const userKey = await Keycloak.getUserInfo(access_token);
    const user = await User.findOne({ keyid: userKey.sub });
    if (!user) {
      return res.status(404).json(ApiResponse.error(404, "Kullanıcı bulunamadı"));
    }

    // === [2] Tool'u başlat ===
    const tool = new ProductSearchTool();
    await tool.initialize();

    const toolResult = await tool.execute({
      query: description,
      context: null,
      intent: null
    });

    if (toolResult.error) {
      return res.status(500).json(ApiResponse.error(500, toolResult.system_message));
    }

    // === [3] Eşleşen ürünlerden firma ID'lerini topla
    const matchedProductIds = toolResult.products.map(p => p._id);
    const uniqueCompanyIds = [...new Set(toolResult.products.map(p => p.companyid?.toString()).filter(Boolean))];

    // === [4] Yeni offerRequest oluştur
    const offerRequest = await OfferRequest.create({
      userid: user._id,
      description,
      isGeneral: true,
      targetProductId: matchedProductIds,
      targetCompanyId: uniqueCompanyIds, // ✅ Yeni alan buraya eklendi
      stateHistory: [{ step: "search", updatedAt: new Date() }],
      offerDeadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3) // +3 gün default
    });

    return res.status(200).json(ApiResponse.success(200, "Arama ve teklif kaydı tamamlandı", {
      offerRequestId: offerRequest._id,
      totalMatchedProducts: matchedProductIds.length,
      totalCompanies: uniqueCompanyIds.length,
      matchedProducts: toolResult.products
    }));

  } catch (error) {
    console.error("Arama hatası:", error);
    return res.status(500).json(ApiResponse.error(500, "Sunucu hatası", { error: error.message }));
  }
});
const updateSettings = asyncHandler(async (req, res) => {
  const {
    offerRequestId,
    contactPreference,
    contactInfo,
    maxOfferCount,
    validUntil,
    additionalNote
  } = req.body;

  // === [0] Temel input kontrolleri ===
  if (!offerRequestId || !contactPreference || !validUntil) {
    return res.status(400).json(ApiResponse.error(400, "Eksik parametre", {
      required: ["offerRequestId", "contactPreference", "validUntil"]
    }));
  }

  try {
    // === [1] Token doğrulama ===
    const access_token = req.kauth?.grant?.access_token?.token;
    if (!access_token) {
      return res.status(401).json(ApiResponse.error(401, "Yetkilendirme hatası", {
        message: "Token bulunamadı veya geçersiz."
      }));
    }

    const userKey = await Keycloak.getUserInfo(access_token);
    const user = await User.findOne({ keyid: userKey.sub });
    if (!user) {
      return res.status(404).json(ApiResponse.error(404, "Kullanıcı bulunamadı"));
    }

    // === [2] Teklif talebi kontrolü ===
    const offerRequest = await OfferRequest.findById(offerRequestId);
    if (!offerRequest) {
      return res.status(404).json(ApiResponse.error(404, "Teklif talebi bulunamadı"));
    }

    // === [3] Sahiplik kontrolü ===
    if (!offerRequest.userid.equals(user._id)) {
      return res.status(403).json(ApiResponse.error(403, "Bu işlem size ait değil."));
    }

    // === [4] Durum kontrolü: sadece generalinfo aşamasında güncellenebilir
    if (offerRequest.state !== "generalinfo") {
      return res.status(400).json(ApiResponse.error(400, "Bu adım şu an güncellenemez."));
    }

    // === [5] Güncelleme objesi
    const update = {
      contactPreference,
      contactInfo: {
        phone: contactInfo?.phone?.trim() || "",
        email: contactInfo?.email?.trim() || ""
      },
      maxOfferCount: Math.max(1, Number(maxOfferCount) || 10),
      validUntil: new Date(validUntil),
      additionalNote: additionalNote?.trim() || ""
    };

    await OfferRequest.findByIdAndUpdate(offerRequestId, update);
    await updateOfferRequestState(offerRequestId, "generalinfo");

    return res.status(200).json(ApiResponse.success(200, "Teklif isteği başarıyla güncellendi", update));
  } catch (err) {
    console.error("Teklif ayar güncelleme hatası:", err);
    return res.status(500).json(ApiResponse.error(500, "Sunucu hatası", { error: err.message }));
  }
});
const expand = asyncHandler(async (req, res) => {
  const { description } = req.body;
  try {
    const access_token = req.kauth?.grant?.access_token?.token;

    // 🛡️ Yetkilendirme
    if (!access_token) {
      return res.status(401).json(ApiResponse.error(401, "Yetkilendirme hatası", {
        message: "Token bulunamadı veya geçersiz."
      }));
    }

    const userkey = await Keycloak.getUserInfo(access_token);
    const user = await User.findOne({ keyid: userkey.sub });
    if (!user) {
      return res.status(404).json(ApiResponse.error(404, "Kullanıcı bulunamadı"));
    }

    const userid = user._id;

    return res.status(200).json(ApiResponse.success(200, 'Arama Tamamlandı.', { expandedDescription: description }));

  } catch (error) {
    console.error('Genel Hata:', error);
    return res.status(500).json(ApiResponse.error(500, 'Sunucu hatası.', { error: error.message }));
  }
});
const completeOfferRequest = asyncHandler(async (req, res) => {
  const { offerRequestId } = req.body;

  if (!offerRequestId) {
    return res.status(400).json(ApiResponse.error(400, "Eksik parametre", {
      message: "offerRequestId gereklidir"
    }));
  }

  try {
    // === [1] Token ve kullanıcı doğrulama ===
    const access_token = req.kauth?.grant?.access_token?.token;
    if (!access_token) {
      return res.status(401).json(ApiResponse.error(401, "Yetkilendirme hatası", {
        message: "Token bulunamadı veya geçersiz."
      }));
    }

    const userKey = await Keycloak.getUserInfo(access_token);
    const user = await User.findOne({ keyid: userKey.sub });
    if (!user) {
      return res.status(404).json(ApiResponse.error(404, "Kullanıcı bulunamadı"));
    }

    // === [2] Teklif isteği kontrolü ===
    const offerRequest = await OfferRequest.findById(offerRequestId);
    if (!offerRequest) {
      return res.status(404).json(ApiResponse.error(404, "Teklif isteği bulunamadı"));
    }

    if (!offerRequest.userid.equals(user._id)) {
      return res.status(403).json(ApiResponse.error(403, "Bu işlem size ait değil."));
    }

    if (offerRequest.state === "completed") {
      return res.status(200).json(ApiResponse.success(200, "Teklif zaten tamamlandı."));
    }

    if (new Date() > offerRequest.offerDeadline) {
      return res.status(400).json(ApiResponse.error(400, "Teklif alma süresi dolmuş."));
    }

    const offerDescription = offerRequest.description || "Teklif isteği açıklaması yok.";
    let productTitle = "Ürün Bilgisi Yok";

    if (offerRequest.productid) {
      const product = await Products.findById(offerRequest.productid);
      if (product) productTitle = product.title || productTitle;
    }

    // === [3] Teklifin ilgili firmalara gönderilmesi ===
    const sentEmailsTo = new Set();

    if (Array.isArray(offerRequest.targetCompanyIds) && offerRequest.targetCompanyIds.length > 0) {
      // Çoklu firma hedefli
      for (const companyId of offerRequest.targetCompanyIds) {
        try {
          const company = await companyProfilModel.findById(companyId);
          if (!company || !company.userid) continue;

          const companyUser = await User.findById(company.userid);
          if (!companyUser || sentEmailsTo.has(companyUser.keyid)) continue;

          const keyUser = await Keycloak.getUserInfoById(companyUser.keyid);

          await sendOfferRequestEmail(keyUser.email, keyUser.firstName, offerDescription, productTitle);
          sentEmailsTo.add(companyUser.keyid);
        } catch (e) {
          console.warn(`Firma ID ${companyId} için e-posta gönderilemedi:`, e.message);
        }
      }

    } else if (offerRequest.productid) {
      // Üründen tek firma hedefle
      const product = await Products.findById(offerRequest.productid);
      const companyId = product?.companyid;
      if (companyId) {
        const company = await companyProfilModel.findById(companyId);
        const companyUser = await User.findById(company?.userid);
        if (companyUser) {
          const keyUser = await Keycloak.getUserInfoById(companyUser.keyid);

          await sendOfferRequestEmail(keyUser.email, keyUser.firstName, offerDescription, product?.title);
        } else {
          return res.status(404).json(ApiResponse.error(404, "Ürünle ilişkili kullanıcı bulunamadı"));
        }
      } else {
        return res.status(400).json(ApiResponse.error(400, "Ürün firması bulunamadı"));
      }

    } else {
      return res.status(400).json(ApiResponse.error(400, "Teklif için hedef firma belirlenemedi."));
    }

    // === [4] Kullanıcıya bilgilendirme e-postası ===
    try {
      await sendOfferCompleteEmail(
        user.email,
        user.name,
        "Teklif isteğiniz tamamlandı. Lütfen gelen teklifleri kontrol edin."
      );
    } catch (e) {
      console.warn("Kullanıcı bilgilendirme e-postası gönderilemedi:", e.message);
    }

    // === [5] Durumu güncelle ===
    await updateOfferRequestState(offerRequestId, "completed");

    return res.status(200).json(ApiResponse.success(200, "Teklif isteği başarıyla tamamlandı."));

  } catch (err) {
    console.error("Tamamlama hatası:", err);
    return res.status(500).json(ApiResponse.error(500, "Sunucu hatası", { error: err.message }));
  }
});

const getForm = asyncHandler(async (req, res) => {
  const { productid } = req.body;

  if (!productid) {
    return res.status(400).json(ApiResponse.error(400, "Eksik parametre", {
      message: "productid gereklidir."
    }));
  }

  try {
    // === [1] Yetkilendirme ===
    const access_token = req.kauth?.grant?.access_token?.token;
    if (!access_token) {
      return res.status(401).json(ApiResponse.error(401, "Yetkilendirme hatası", {
        message: "Token bulunamadı veya geçersiz."
      }));
    }

    const userkey = await Keycloak.getUserInfo(access_token);
    const user = await User.findOne({ keyid: userkey.sub });
    if (!user) {
      return res.status(404).json(ApiResponse.error(404, "Kullanıcı bulunamadı"));
    }

    // === [2] Ürün kontrolü ===
    const productDB = new ProductsDB();
    const product = await productDB.light({ _id: productid });

    if (!product) {
      return res.status(404).json(ApiResponse.error(404, "Ürün bulunamadı"));
    }

    if (product.pricetype !== "offer_based") {
      return res.status(400).json(ApiResponse.error(400, "Bu ürün teklif bazlı değil", {
        pricetype: product.pricetype
      }));
    }

    if (!product.requestForm) {
      return res.status(400).json(ApiResponse.error(400, "Bu ürün için form tanımlanmamış"));
    }

    // === [3] Formu getir ===
    const form = await DynamicForm.findOne({ _id: product.requestForm })
      .populate({ path: "fields", model: "formfield", select: "-vector" });

    if (!form) {
      return res.status(404).json(ApiResponse.error(404, "Form bulunamadı"));
    }

    return res.status(200).json(ApiResponse.success(200, "Form başarıyla getirildi", {
      formid: form._id,
      fields: form.fields
    }));

  } catch (error) {
    console.error("Form getirme hatası:", error);
    return res.status(500).json(ApiResponse.error(500, "Sunucu hatası", {
      error: error.message
    }));
  }
});

const submitOfferResponse = asyncHandler(async (req, res) => {
  const {
    offerRequestId,
    price,
    currency,
    description,
    estimatedStartDate,
    estimatedEndDate
  } = req.body;

  if (!offerRequestId || !price || !estimatedStartDate || !estimatedEndDate) {
    return res.status(400).json(ApiResponse.error(400, "Eksik parametre", {
      required: ["offerRequestId", "price", "estimatedStartDate", "estimatedEndDate"]
    }));
  }

  try {
    // === [1] Token & kullanıcı doğrulama ===
    const access_token = req.kauth?.grant?.access_token?.token;
    if (!access_token) {
      return res.status(401).json(ApiResponse.error(401, "Yetkilendirme hatası", {
        message: "Token bulunamadı veya geçersiz."
      }));
    }

    const keyUser = await Keycloak.getUserInfo(access_token);
    const user = await User.findOne({ keyid: keyUser.sub });
    if (!user) {
      return res.status(404).json(ApiResponse.error(404, "Kullanıcı bulunamadı"));
    }

    // === [2] Firma bilgisi kontrolü ===
    const company = await companyProfilModel.findOne({ userid: user._id });
    if (!company) {
      return res.status(403).json(ApiResponse.error(403, "Şirkete bağlı kullanıcı değilsiniz"));
    }

    // === [3] Teklif isteği kontrolü ===
    const offerRequest = await OfferRequest.findById(offerRequestId);
    if (!offerRequest) {
      return res.status(404).json(ApiResponse.error(404, "Teklif isteği bulunamadı"));
    }

    const isTargeted = (
      (offerRequest.targetCompanyId && offerRequest.targetCompanyId.toString() === company._id.toString()) ||
      (Array.isArray(offerRequest.targetCompanyIds) && offerRequest.targetCompanyIds.includes(company._id))
    );

    if (!isTargeted && !offerRequest.isGeneral) {
      return res.status(403).json(ApiResponse.error(403, "Bu teklif isteğine yanıt verme yetkiniz yok"));
    }

    const already = await OfferResponse.findOne({
      offerRequestId,
      companyId: company._id
    });

    if (already) {
      return res.status(409).json(ApiResponse.error(409, "Bu teklif isteğine zaten yanıt verdiniz"));
    }

    // === [4] Kaydet ===
    const offerResponse = await OfferResponse.create({
      offerRequestId,
      companyId: company._id,
      responderId: user._id,
      price,
      currency: currency || "USD",
      description: description || "",
      estimatedStartDate: new Date(estimatedStartDate),
      estimatedEndDate: new Date(estimatedEndDate)
    });

    // === [5] E-posta gönderimi gerekiyorsa ===
    if (offerRequest.contactPreference === "email") {
      const requesterUser = await User.findById(offerRequest.userid);
      if (requesterUser) {
        await sendOfferResponseEmail({
          email: requesterUser.email,
          name: requesterUser.name || "Kullanıcı",
          companyName: company.name || "Firma",
          price,
          description,
          estimatedStartDate,
          estimatedEndDate,
          productTitle: offerRequest.description || "Genel Teklif"
        });
      }
    }

    return res.status(200).json(ApiResponse.success(200, "Teklif yanıtınız başarıyla kaydedildi", {
      responseId: offerResponse._id
    }));

  } catch (err) {
    console.error("Teklif yanıtlama hatası:", err);
    return res.status(500).json(ApiResponse.error(500, "Sunucu hatası", {
      error: err.message
    }));
  }
});

module.exports = {
  search, expand, makeform, makeFormFromProducts, getForm,submitOfferResponse, updateSettings, saveFormResponse, completeOfferRequest
};
