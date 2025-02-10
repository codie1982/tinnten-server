const express = require("express")
const route = express.Router()
const { upload,uploadProfilImage } = require("../controller/uploadController")
const { keycloak, memoryStore } = require('../helpers/keycloak-config');

route.post("/upload", keycloak.protect(), upload)

route.post("/upload/profil/image", keycloak.protect(), uploadProfilImage)

module.exports = route