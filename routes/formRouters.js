const express = require("express")
const route = express.Router()
const { keycloak, memoryStore } = require('../helpers/keycloak-config');

const {
    addForm,
    getForms,
    getFormDetail,
    updateForm,
    deleteForm,
    updateFormField,
    deleteFormField
  } = require("../controller/formController");
  
  // === 📦 Form CRUD ===
  
  // Form oluştur
  route.post("/", keycloak.protect(), addForm);
  
  // Tüm formları getir (kullanıcıya ait veya companyid ile)
  route.get("/:companyid", keycloak.protect(), getForms);
  
  // Form detayını getir (formid ile)
  route.get("/detail/:formid", getFormDetail); // 👈 tüm kullanıcılara açık
  
  // Formu güncelle (formid ile)
  route.put("/:companyid/:formid", keycloak.protect(), updateForm);
  
  // Formu sil (formid ile)
  route.delete("/:companyid/:formid", keycloak.protect(), deleteForm);
  
  // === 🧩 Form Field Alt İşlemleri ===
  
  // Form alanını güncelle (formid + fieldid)
  route.put("/:companyid/:formid/fields/:fieldid", keycloak.protect(), updateFormField);
  
  // Form alanını sil (formid + fieldid)
  route.delete("/:companyid/:formid/fields/:fieldid", keycloak.protect(), deleteFormField);
  
  module.exports = route;