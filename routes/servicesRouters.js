const express = require("express")
const route = express.Router()
const { getService, addService } = require("../controller/servicesController")
const { keycloak, memoryStore } = require('../helpers/keycloak-config');



route.post("/", keycloak.protect(), addService)
route.get("/", keycloak.protect(), getService)
module.exports = route