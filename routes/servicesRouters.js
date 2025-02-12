const express = require("express")
const route = express.Router()
const { getServices } = require("../controller/servicesController")
const { keycloak, memoryStore } = require('../helpers/keycloak-config');



route.post("/", keycloak.protect(), getServices)

module.exports = route