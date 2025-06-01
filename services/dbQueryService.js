const mongoose = require("mongoose");

// 📦 Manuel model yüklemeleri
const models = {
  user: require("../mongoModels/userModel"),
  product: require("../mongoModels/productsModel"),
  offerrequest: require("../mongoModels/offerRequestModel"),
  accounts: require("../mongoModels/accountModel"),
  addresses: require("../mongoModels/addresModel"),
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