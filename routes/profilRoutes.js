const express = require("express")
const route = express.Router()
const {
    createProfile,
    getProfile,
    updateProfile,
    updatePhoneNumbers,
    updateAddresses,
    updateSocialLinks,
    deleteProfile
} = require("../controller/profilController")

const { keycloak, memoryStore } = require('../helpers/keycloak-config');
const { checkRole } = require("../middleware/checkRole");


route.post("/", keycloak.protect(), checkRole("admin"), createProfile)
route.get("/", keycloak.protect(), getProfile)
route.put("/", keycloak.protect(), updateProfile)
route.put("/update-phones", keycloak.protect(), updatePhoneNumbers)
route.put("/update-address", keycloak.protect(), updateAddresses)
route.put("/update-social-links", keycloak.protect(), updateSocialLinks)
route.delete("/", keycloak.protect(), checkRole("admin"), deleteProfile)

module.exports = route