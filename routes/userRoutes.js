const express = require("express")
const route = express.Router()
const { info } = require("../controller/usersController")
const { keycloak, memoryStore } = require('../helpers/keycloak-config');
 


route.post("/info",keycloak.protect(), info)
module.exports = route