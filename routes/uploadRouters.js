const express = require("express")
const route = express.Router()
const { uploadProfilImage ,uploadByCompany} = require("../controller/uploadController")
const { keycloak, memoryStore } = require('../helpers/keycloak-config');



route.post("/profil/image", keycloak.protect(), uploadProfilImage)
route.post("/multiple", keycloak.protect(), uploadByCompany)

module.exports = route