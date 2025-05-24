const asyncHandler = require("express-async-handler");
const axios = require("axios")
const validator = require("validator");
const Company = require("../mongoModels/companyProfilModel.js")
const Account = require("../mongoModels/accountModel.js")
const SystemPackages = require("../mongoModels/systemPackageModel.js")
const DynamicForm = require("../mongoModels/dynamicFormModel.js")
const FormField = require("../mongoModels/formFieldModel.js")
const Price = require("../mongoModels/priceModel.js")
const Variant = require("../mongoModels/variantsModel.js")
const Gallery = require("../mongoModels/galleryModel.js")
const Image = require("../mongoModels/imagesModel.js")
const User = require("../mongoModels/userModel.js")
const ApiResponse = require("../helpers/response.js")
const Keycloak = require("../lib/Keycloak.js");

const AccountManager = require("../helpers/AccountManager.js")


/**
 * @desc Yeni dinamik form oluşturur (firma bazlı)
 * @route POST /api/v10/forms
 * @access Private (firma kullanıcısı)
 */
const addForm = asyncHandler(async (req, res) => {
  const {
    companyid,
    formName,
    description,
    fields = [] // UUID ile gelen form alanları
  } = req.body;

  // === [1] Kullanıcı doğrulama
  const access_token = req.kauth.grant.access_token.token;
  const userInfo = await Keycloak.getUserInfo(access_token);
  const userkeyid = userInfo.sub;

  let user = await User.findOne({ keyid: userkeyid });
  if (!user) user = await new User({ keyid: userkeyid }).save();

  // === [2] Firma kontrolü
  const company = await Company.findById({ _id: companyid });
  if (!company || !company.active) {
    return res.status(404).json(ApiResponse.error(404, "Firma bulunamadı veya aktif değil."));
  }

  const isUserInCompany = await Company.exists({
    _id: companyid,
    "employees.userid": user._id
  });

  if (!isUserInCompany) {
    return res.status(403).json(ApiResponse.error(403, "Bu firmaya form ekleme yetkiniz yok."));
  }

  // === [3] Form alanlarını oluştur
  const fieldObjectIds = [];

  for (const field of fields) {
    const vectorTextParts = [
      field.label,
      field.options?.map(attr => `${attr.label}: ${attr.value}`).join(' '),
    ];

    const vectorText = vectorTextParts
      .filter(Boolean)
      .map(text => text.toString().trim())
      .join(' ')
      .slice(0, 1000);

    const vectorResponse = await axios.post(process.env.EMBEDDING_URL + "/api/v10/llm/vector", { text: vectorText });
    const newField = new FormField({
      label: field.label,
      type: field.type,
      required: field.required,
      placeholder: field.placeholder || "",
      options: field.options || [],
      validation: field.validation || {},
      dependencies: field.dependencies || [],
      locationType: field.locationType || "none",
      vector: vectorResponse.data.vector
    });

    await newField.save();
    fieldObjectIds.push(newField._id);
  }

  // === [4] Formu oluştur
  const newForm = new DynamicForm({
    companyid,
    formName,
    description,
    fields: fieldObjectIds
  });

  await newForm.save();

  return res.status(201).json(ApiResponse.success(201, "Form başarıyla oluşturuldu.", newForm));
});
/**
 * @desc Belirli bir firmaya ait tüm formları listeler
 * @route GET /api/v10/forms/:companyid
 * @access Private (firma kullanıcısı)
 */
const getForms = asyncHandler(async (req, res) => {
  const { companyid } = req.params;

  if (!companyid) {
    return res.status(400).json(ApiResponse.error(400, "Firma ID’si gerekli."));
  }

  // === [1] Kullanıcı doğrulama
  const access_token = req.kauth.grant.access_token.token;
  const userInfo = await Keycloak.getUserInfo(access_token);
  const userkeyid = userInfo.sub;

  let user = await User.findOne({ keyid: userkeyid });
  if (!user) user = await new User({ keyid: userkeyid }).save();

  // === [2] Firma erişim kontrolü
  const isUserInCompany = await Company.exists({
    _id: companyid,
    "employees.userid": user._id
  });

  if (!isUserInCompany) {
    return res.status(403).json(ApiResponse.error(403, "Bu firmaya erişim yetkiniz yok."));
  }

  // === [3] Formları çek
  const forms = await DynamicForm.find({ companyid })
    .populate({ path: "fields", model: "formfield" })
    .sort({ createdAt: -1 });

  if (!forms.length) {
    return res.status(200).json(ApiResponse.error(404, "Bu firmaya ait form bulunamadı.", []));
  }

  return res.status(200).json(ApiResponse.success(200, "Formlar başarıyla listelendi.", forms));
});

/**
 * @desc Belirli bir formun tüm detaylarını getirir (alanlarıyla birlikte)
 * @route GET /api/v10/forms/:companyid/:formid
 * @access Private (firma kullanıcısı)
 */
const getFormDetail = asyncHandler(async (req, res) => {
  const { formid } = req.params;

  // === [1] Kullanıcı doğrulama
  const access_token = req.kauth.grant.access_token.token;
  const userInfo = await Keycloak.getUserInfo(access_token);
  const userkeyid = userInfo.sub;

  let user = await User.findOne({ keyid: userkeyid });
  if (!user) user = await new User({ keyid: userkeyid }).save();


  // === [3] Formu detaylı çek
  const form = await DynamicForm.findOne({
    _id: formid,
  }).populate({ path: "fields", model: "formfield" });

  if (!form) {
    return res.status(404).json(ApiResponse.error(404, "Form bulunamadı."));
  }

  return res.status(200).json(ApiResponse.success(200, "Form detayları başarıyla getirildi.", form));
});
/**
 * @desc Form adını, açıklamasını ve alanlarını günceller
 * @route PUT /api/v10/forms/:companyid/:formid
 * @access Private (firma kullanıcısı)
 */
const updateForm = asyncHandler(async (req, res) => {
  try {
    const { companyid, formid } = req.params;
    const { formName, description, fields } = req.body;

    // ✅ 1. Girdi Doğrulama
    if (!formName || !fields || !Array.isArray(fields)) {
      console.warn("Eksik veya hatalı veri:", { formName, fields });
      return res.status(400).json(ApiResponse.error(400, "Form adı ve geçerli field dizisi gereklidir."));
    }

    // 🔐 2. Kullanıcı Doğrulama
    const access_token = req.kauth?.grant?.access_token?.token;
    if (!access_token) {
      console.error("Token eksik");
      return res.status(401).json(ApiResponse.error(401, "Kimlik doğrulama başarısız."));
    }

    const userInfo = await Keycloak.getUserInfo(access_token);
    const userkeyid = userInfo?.sub;
    if (!userkeyid) {
      console.error("UserInfo alınamadı:", userInfo);
      return res.status(401).json(ApiResponse.error(401, "Geçersiz kullanıcı bilgisi."));
    }

    const user = await User.findOne({ keyid: userkeyid });
    if (!user) {
      console.warn("Kullanıcı bulunamadı:", userkeyid);
      return res.status(403).json(ApiResponse.error(403, "Kullanıcı bulunamadı."));
    }

    const isUserInCompany = await Company.exists({
      _id: companyid,
      "employees.userid": user._id
    });
    if (!isUserInCompany) {
      console.warn("Kullanıcı firmaya ait değil:", { companyid, userid: user._id });
      return res.status(403).json(ApiResponse.error(403, "Bu firmada işlem yetkiniz yok."));
    }

    // 🔍 3. Form Doğrulama
    const form = await DynamicForm.findOne({ _id: formid, companyid });
    if (!form) {
      console.warn("Form bulunamadı:", { formid, companyid });
      return res.status(404).json(ApiResponse.error(404, "Form bulunamadı."));
    }

    // ✏️ 4. Form ad ve açıklama güncellemesi
    form.formName = formName || form.formName;
    form.description = description || form.description;

    // 🔁 5. Field güncellemeleri
    const updatedFieldIds = [];

    for (const field of fields) {
      const vectorTextParts = [
        field.label,
        field.options?.map(attr => `${attr.label}: ${attr.value}`).join(' '),
      ];

      const vectorText = vectorTextParts
        .filter(Boolean)
        .map(text => text.toString().trim())
        .join(' ')
        .slice(0, 1000);

      const vectorResponse = await axios.post(process.env.EMBEDDING_URL + "/api/v10/llm/vector", { text: vectorText });
      try {
        if (field._id) {
          const updated = await FormField.findByIdAndUpdate(field._id, { $set: { ...field, vector: vectorResponse.data.vector } }, { new: true });
          if (updated) updatedFieldIds.push(updated._id);
          else console.warn("Field güncellenemedi:", field._id);
        } else {
          // Yeni alan eklenirken _id varsa sil
          if (field._id === null || field._id === undefined) {
            delete field._id;
          }

          const newField = new FormField({ ...field, vector: vectorResponse.data.vector });
          await newField.save();
          updatedFieldIds.push(newField._id);
        }
      } catch (fieldError) {
        console.error("FormField işlem hatası:", field, fieldError);
      }
    }

    // 🔗 6. Field ID'lerini form'a ata
    form.fields = updatedFieldIds;
    await form.save();

    return res.status(200).json(ApiResponse.success(200, "Form başarıyla güncellendi.", form));

  } catch (error) {
    console.error("🔥 updateForm genel hata:", error);
    return res.status(500).json(ApiResponse.error(500, "Form güncelleme sırasında beklenmeyen bir hata oluştu.", error.message));
  }
});
/**
 * @desc Formu ve bağlı tüm field’ları siler
 * @route DELETE /api/v10/forms/:companyid/:formid
 * @access Private
 */
const deleteForm = asyncHandler(async (req, res) => {
  const { companyid, formid } = req.params;

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

  const form = await DynamicForm.findOne({ _id: formid, companyid });
  if (!form) return res.status(404).json(ApiResponse.error(404, "Form bulunamadı."));

  await FormField.deleteMany({ _id: { $in: form.fields } });
  await DynamicForm.deleteOne({ _id: form._id });

  return res.status(200).json(ApiResponse.success(200, "Form ve alanları silindi."));
});

/**
 * @desc Belirli bir form alanını günceller
 * @route PUT /api/v10/forms/:companyid/:formid/fields/:fieldid
 * @access Private
 */
const updateFormField = asyncHandler(async (req, res) => {
  const { companyid, formid, fieldid } = req.params;
  const updatedData = req.body;

  // ✅ Kullanıcı doğrulama
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
    return res.status(403).json(ApiResponse.error(403, "Bu firmada işlem yetkiniz yok."));
  }

  const form = await DynamicForm.findOne({ _id: formid, companyid });
  if (!form || !form.fields.includes(fieldid)) {
    return res.status(404).json(ApiResponse.error(404, "Form veya alan bulunamadı."));
  }

  const updatedField = await FormField.findByIdAndUpdate(
    fieldid,
    { $set: updatedData },
    { new: true }
  );

  return res.status(200).json(ApiResponse.success(200, "Form alanı güncellendi.", updatedField));
});

/**
 * @desc Belirli bir form alanını siler (ve formdan kaldırır)
 * @route DELETE /api/v10/forms/:companyid/:formid/fields/:fieldid
 * @access Private
 */
const deleteFormField = asyncHandler(async (req, res) => {
  const { companyid, formid, fieldid } = req.params;

  // ✅ Kullanıcı doğrulama
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
    return res.status(403).json(ApiResponse.error(403, "Bu firmada işlem yetkiniz yok."));
  }

  const form = await DynamicForm.findOne({ _id: formid, companyid });
  if (!form || !form.fields.includes(fieldid)) {
    return res.status(404).json(ApiResponse.error(404, "Form veya alan bulunamadı."));
  }

  await FormField.deleteOne({ _id: fieldid });

  await DynamicForm.updateOne(
    { _id: formid },
    { $pull: { fields: fieldid } }
  );

  return res.status(200).json(ApiResponse.success(200, "Form alanı silindi."));
});
module.exports = {
  addForm, getForms, getFormDetail, updateForm, deleteForm, updateFormField, deleteFormField
};

