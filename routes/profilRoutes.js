const express = require("express")
const route = express.Router()
const {
    createProfile,
    getAllProfiles,
    getProfileById,
    updateProfile,
    updatePhoneNumbers,
    updateAddresses,
    updateSocialLinks,
    deleteProfile
} = require("../controller/profilController")

const { keycloak, memoryStore } = require('../helpers/keycloak-config');



route.post("/", keycloak.protect(), createProfile)
route.get("/", keycloak.protect(), getAllProfiles)
route.get("/:id", keycloak.protect(), getProfileById)
route.put("/", keycloak.protect(), updateProfile)
route.put("/phone", keycloak.protect(), updatePhoneNumbers)
route.put("/addres", keycloak.protect(), updateAddresses)
route.put("/social", keycloak.protect(), updateSocialLinks)
route.delete("/", keycloak.protect(), deleteProfile)

module.exports = route