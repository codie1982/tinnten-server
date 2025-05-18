const express = require("express")
const route = express.Router()
const {
    addService,
    getServices,
    getServiceDetail,
    updateService,
    updateServicePrice,
    updateServiceGallery,
    updateServiceRequestForm,
    deleteService,
    deleteServicePrice,
    deleteServiceGallery,
    deleteServiceRequestForm
  } = require("../controller/servicesController");
  
  const { keycloak } = require("../helpers/keycloak-config");
  
  // === 🆕 Hizmet Oluşturma & Listeleme ===
  route.post("/", keycloak.protect(), addService);

// === 📥 Listeleme & Detay ===
route.get("/:id", keycloak.protect(), getServices);            // Firma hizmetleri
route.get("/:id/:sid", keycloak.protect(), getServiceDetail);  // Hizmet detayı
  
  // === ✏️ Güncellemeler (Modüler) ===
  route.put("/:companyid/:serviceid", keycloak.protect(), updateService);
  route.put("/:companyid/:serviceid/price", keycloak.protect(), updateServicePrice);
  route.put("/:companyid/:serviceid/gallery", keycloak.protect(), updateServiceGallery);
  route.put("/:companyid/:serviceid/request-form", keycloak.protect(), updateServiceRequestForm);
  
  // === 🗑️ Silmeler (Modüler) ===
  route.delete("/:companyid/:serviceid", keycloak.protect(), deleteService);
  route.delete("/:companyid/:serviceid/price", keycloak.protect(), deleteServicePrice);
  route.delete("/:companyid/:serviceid/gallery", keycloak.protect(), deleteServiceGallery);
  route.delete("/:companyid/:serviceid/request-form", keycloak.protect(), deleteServiceRequestForm);
  
  module.exports = route;