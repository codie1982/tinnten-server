const express = require("express")
const route = express.Router()
const { getFavorites } = require("../controller/favoriteController")
const { keycloak, memoryStore } = require('../helpers/keycloak-config');



route.post("/", keycloak.protect(), getFavorites)

module.exports = route