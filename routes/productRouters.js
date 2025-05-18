const express = require("express")
const route = express.Router()
const { getProducts, addProduct, getProductDetail,getProductBase, deleteProductRequestForm,
    deleteProductGallery, deleteProductVariants, deleteProductBasePrice,getProductGallery,getProductVariants,
    deleteProduct, deleteImageFromGallery, getProductBasePrice,updateProductBasePrice,
    updateProductGallery, updateProductVariants, updateProduct, updateProductRequestForm } = require("../controller/productsController")
const { keycloak, memoryStore } = require('../helpers/keycloak-config');


// === 📦 Ürün CRUD ===
route.post("/", keycloak.protect(), addProduct);
route.get("/:id", keycloak.protect(), getProducts);

// === 🧩 Alt Alan Getirme ===
route.get("/base/:id/:pid", keycloak.protect(), getProductBase);
route.get("/base-price/:id/:pid", keycloak.protect(), getProductBasePrice);
route.get("/gallery/:id/:pid", keycloak.protect(), getProductGallery);
route.get("/variants/:id/:pid", keycloak.protect(), getProductVariants);

// === 🧩 Alt Alan Güncellemeleri ===
route.put("/:id/:pid", keycloak.protect(), updateProduct);
route.put("/variants/:id/:pid", keycloak.protect(), updateProductVariants);
route.put("/gallery/:id/:pid", keycloak.protect(), updateProductGallery);
route.put("/request-form/:id/:pid", keycloak.protect(), updateProductRequestForm);
route.put("base-price/:id/:pid", keycloak.protect(), updateProductBasePrice);

// === 🗑️ Alt Alan Silme ===
route.delete("/:id/:pid", keycloak.protect(), deleteProduct);
route.delete("/variants/:id/:pid", keycloak.protect(), deleteProductVariants);
route.delete("/gallery/:id/:pid", keycloak.protect(), deleteProductGallery);
route.delete("/request-form/:id/:pid", keycloak.protect(), deleteProductRequestForm);
route.delete("/base-price/:id/:pid", keycloak.protect(), deleteProductBasePrice);

// === 🖼️ Galeriden Tek Görsel Silme ===
route.delete("/gallery/:id/:pid/image/:imageid", keycloak.protect(), deleteImageFromGallery);
module.exports = route