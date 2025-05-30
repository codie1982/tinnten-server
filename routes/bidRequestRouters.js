const express = require("express")
const route = express.Router()
const { search, expand, makeform, saveFormResponse, generalinfo } = require("../controller/bidController")
const { keycloak, memoryStore } = require('../helpers/keycloak-config');



route.post("/expand", keycloak.protect(), expand)
route.post("/makeform", keycloak.protect(), makeform)
route.post("/search", keycloak.protect(), search)
route.post("/saveform", keycloak.protect(), saveFormResponse)
route.post("/info", keycloak.protect(), generalinfo)

module.exports = route