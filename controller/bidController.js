
const asyncHandler = require("express-async-handler");
const ApiResponse = require("../helpers/response.js")
const Keycloak = require("../lib/Keycloak.js");
const OfferRequest = require("../mongoModels/offerRequestModel.js")
const OfferResponse = require("../mongoModels/offerReponseModel.js")
const DynamicForm = require("../mongoModels/dynamicFormModel.js")
const formfield = require("../mongoModels/formFieldModel.js")
const FormResponse = require("../mongoModels/formResponseModel.js")
const ProductsDB = require("../db/ProductsDB.js");
const Products = require("../mongoModels/productsModel.js");

const User = require("../mongoModels/userModel.js")

const AccountManager = require("../helpers/AccountManager.js");
const { trace } = require("joi");


const makeform = asyncHandler(async (req, res) => {
  const { description, productid } = req.body;


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

    // === [1] Ürün ID'si varsa ve sabit ürünle ilerleniyorsa
    if (productid) {
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

      const form = await DynamicForm.findOne({ _id: product.requestForm })
        .populate({ path: "fields", model: "formfield", select: "-vector" });

      if (!form) {
        return res.status(404).json(ApiResponse.error(404, "Form bulunamadı"));
      }

      //Güncelleme
      await new OfferRequest({
        userid: userid,
        productid: productid,
        description: description,
        state: "makeform",
        isGeneral: false, // Genel teklif mi?
        dynamicFormId: form._id,
        targetCompanyId: product.companyid, // Ürün sahibi firma
        offerDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Teklif verme süresi 7 gün
        notificationStatus: "pending"
      }).save();

      return res.status(200).json(ApiResponse.success(200, "Form başarıyla bulundu", {
        formid: form._id,
        fields: form.fields
      }));

    } else {
      // === [2] Ürün ID'si yoksa: semantic eşleşme ile ürün bulma


      if (!description) {
        return res.status(400).json(ApiResponse.error(400, "Eksik parametre", {
          message: "Lütfen açıklama giriniz."
        }));
      }
    }


    // Devamı ikinci aşamada yazılacak...

  } catch (error) {
    console.error('Teklif Formu Hatası:', error);
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

    if (["answerform", "generalinfo","completed"].includes(offerRequest.state)) {
      return res.status(403).json(ApiResponse.error(403, "Bu form soru cevaplama aşamasını geçmiş."));
    }
    // === [3] Form ve alanlar çek ===
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

    await OfferRequest.findByIdAndUpdate(offerRequestId, { state: "answerform" });

    return res.status(200).json(ApiResponse.success(200, "Form cevapları kaydedildi", {
      saved: responses.length
    }));

  } catch (err) {
    console.error("Form kaydetme hatası:", err);
    return res.status(500).json(ApiResponse.error(500, "Sunucu hatası", { error: err.message }));
  }
});
const search = asyncHandler(async (req, res) => {
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

    // === [3] Formu detaylı çek
    const form = await DynamicForm.findOne({
      _id: "6832df9602b4db3fc5cf25b1",
    }).populate({ path: "fields", model: "formfield", select: "-vector" });

    return res.status(200).json(ApiResponse.success(200, 'Arama Tamamlandı.', { fields: form.fields }));

  } catch (error) {
    console.error('Genel Hata:', error);
    return res.status(500).json(ApiResponse.error(500, 'Sunucu hatası.', { error: error.message }));
  }
});
const generalinfo = asyncHandler(async (req, res) => {
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

    // === [3] Formu detaylı çek
    const form = await DynamicForm.findOne({
      _id: "6832df9602b4db3fc5cf25b1",
    }).populate({ path: "fields", model: "formfield", select: "-vector" });

    return res.status(200).json(ApiResponse.success(200, 'Arama Tamamlandı.', { fields: form.fields }));

  } catch (error) {
    console.error('Genel Hata:', error);
    return res.status(500).json(ApiResponse.error(500, 'Sunucu hatası.', { error: error.message }));
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


module.exports = {
  search, expand, makeform, generalinfo, saveFormResponse
};
