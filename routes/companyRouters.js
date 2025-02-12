const express = require("express")
const route = express.Router()
const { createCompanyProfile } = require("../controller/companyController")
const { keycloak, memoryStore } = require('../helpers/keycloak-config');



route.post("/", keycloak.protect(), createCompanyProfile)
module.exports = route