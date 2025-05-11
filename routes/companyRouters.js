const express = require("express")
const route = express.Router()
const { createCompanyProfile, checkCompanySlug,
    updateCompanyProfile, getCompanyProfile,
    createPhone, updatePhone, createAddress,
    updateAddress, createSocial, updateSocial,
    deleteCompanyProfile, deletePhone, deleteSocial,deleteAddress } = require("../controller/companyController")
const { keycloak, memoryStore } = require('../helpers/keycloak-config');



route.get("/me", keycloak.protect(), getCompanyProfile)
route.post("/create", keycloak.protect(), createCompanyProfile)
route.put("/me", keycloak.protect(), updateCompanyProfile)
route.delete("/me", keycloak.protect(), deleteCompanyProfile)


route.post("/phone", keycloak.protect(), createPhone)
route.put("/phone/:id", keycloak.protect(), updatePhone)
route.delete("/phone/:id", keycloak.protect(), deletePhone)

route.post("/address", keycloak.protect(), createAddress)
route.put("/address/:id", keycloak.protect(), updateAddress)
route.delete("/address/:id", keycloak.protect(), deleteAddress)

route.post("/social", keycloak.protect(), createSocial)
route.put("/social/:id", keycloak.protect(), updateSocial)
route.delete("/social/:id", keycloak.protect(), deleteSocial)


route.post("/check/slug", keycloak.protect(), checkCompanySlug)
module.exports = route