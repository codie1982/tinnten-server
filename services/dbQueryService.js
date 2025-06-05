const mongoose = require("mongoose");

// 📦 Manuel model yüklemeleri
const models = {
  user: require("../mongoModels/userModel"),
  product: require("../mongoModels/productsModel"),
  offerrequest: require("../mongoModels/offerRequestModel"),
  accounts: require("../mongoModels/accountModel"),
  addresses: require("../mongoModels/addresModel"),
  answer: require("../mongoModels/answerModel"),
  bidlocation: require("../mongoModels/bidlocationModel"),
  companyprofile: require("../mongoModels/companyProfilModel"),
  content: require("../mongoModels/contentModel"),
  conversation: require("../mongoModels/conversationModel"),
  document: require("../mongoModels/documentModel"),
  dynamicform: require("../mongoModels/dynamicFormModel"),
  favorite: require("../mongoModels/favoriteModel"),
  favoriteproduct: require("../mongoModels/favoriteProductModel"),
  files: require("../mongoModels/filesModel"),
  formfield: require("../mongoModels/formFieldModel"),
  formResponse: require("../mongoModels/formResponseModel"),
  gallery: require("../mongoModels/galleryModel"),
  images: require("../mongoModels/imagesModel"),
  interest: require("../mongoModels/interestModel"),
  maillog: require("../mongoModels/mailLogModel"),
  mailverify: require("../mongoModels/mailverifyModel"),
  message: require("../mongoModels/messageModel"),
  offercompanymapping: require("../mongoModels/offerCompanyMappingModel"),
  offercompanyreletation: require("../mongoModels/offerCompanyRelationModel"),
  offerresponse: require("../mongoModels/offerReponseModel"),
  offerrequest: require("../mongoModels/offerRequestModel"),
  phones: require("../mongoModels/phoneModel"),
  potentialinterest: require("../mongoModels/potentialInterestModel"),
  price: require("../mongoModels/priceModel"),
  pricerange: require("../mongoModels/priceRangeModel"),
  products: require("../mongoModels/productsModel"),
  promotioncompany: require("../mongoModels/promotionCompanyModel"),
  question: require("../mongoModels/questionModel"),
  recommendation: require("../mongoModels/recommendationModel"),
  servicesarea: require("../mongoModels/serviceAreaModel"),
  services: require("../mongoModels/servicesModel"),
  sociallinks: require("../mongoModels/socilaLinksModel"),
  uploads: require("../mongoModels/uploadModel"),
  usagelog: require("../mongoModels/usageLogModel"),
  userbehavior: require("../mongoModels/userBehaviorModel"),
  usermemory: require("../mongoModels/userMemoryModel"),
  users: require("../mongoModels/userModel"),
  userprofile: require("../mongoModels/userProfilModel"),
  variants: require("../mongoModels/variantsModel"),
  // diğer modeller burada tanımlanmalı
};

// 🔍 Model getirici
const getModel = (collectionName) => {
  const key = collectionName.toLowerCase();
  const model = models[key];

  if (!model) {
    console.error("❌ Geçersiz model ismi:", collectionName);
    console.error("📦 Yüklü modeller:", Object.keys(models));
    throw new Error(`Model bulunamadı: ${collectionName}`);
  }

  return model;
};

//
// === 🛠️ Temel ve Gelişmiş CRUD Fonksiyonları ===
//

exports.handleInsert = async (collection, payload) => {
  const Model = getModel(collection);
  const doc = new Model(payload);
  await doc.save();
  console.log(`✅ [INSERT] ${collection} koleksiyonuna kayıt eklendi.`);
};

exports.handleUpdate = async (collection, query, payload) => {
  const Model = getModel(collection);
  await Model.updateMany(query, payload);
  console.log(`✅ [UPDATE] ${collection} koleksiyonu güncellendi.`);
};

exports.handleUpdateOne = async (collection, query, payload) => {
  const Model = getModel(collection);
  await Model.updateOne(query, payload);
  console.log(`✅ [UPDATE_ONE] ${collection} koleksiyonunda bir kayıt güncellendi.`);
};

exports.handleUpsert = async (collection, query, payload) => {
  const Model = getModel(collection);
  await Model.updateOne(query, payload, { upsert: true });
  console.log(`✅ [UPSERT] ${collection} koleksiyonunda kayıt eklendi/güncellendi.`);
};

exports.handleBulkInsert = async (collection, payloadArray) => {
  const Model = getModel(collection);
  await Model.insertMany(payloadArray);
  console.log(`✅ [BULK_INSERT] ${collection} koleksiyonuna ${payloadArray.length} kayıt eklendi.`);
};

exports.handleFindAndUpdate = async (collection, query, payload) => {
  const Model = getModel(collection);
  const result = await Model.findOneAndUpdate(query, payload, { new: true });
  console.log(`✅ [FIND_AND_UPDATE] ${collection} kaydı güncellendi.`);
  return result;
};

exports.handleDelete = async (collection, query) => {
  const Model = getModel(collection);
  await Model.deleteMany(query);
  console.log(`✅ [DELETE] ${collection} koleksiyonundan kayıt silindi.`);
};