const express = require("express")
const route = express.Router()
const { getProducts } = require("../controller/productsController")
const { keycloak, memoryStore } = require('../helpers/keycloak-config');



route.get("/", keycloak.protect(), getProducts)

module.exports = route