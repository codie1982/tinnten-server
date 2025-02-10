const express = require("express")
const route = express.Router()
const { create,chat,history } = require("../controller/conversationControlller")
const { keycloak, memoryStore } = require('../helpers/keycloak-config');

route.post("/create", keycloak.protect(), create)
route.post("/chat", keycloak.protect(), chat)
route.post("/history", keycloak.protect(), history)
module.exports = route