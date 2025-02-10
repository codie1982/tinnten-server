const express = require("express")
const route = express.Router()
const { refreshtoken,checksession} = require("../controller/authController")
const { keycloak, memoryStore } = require('../helpers/keycloak-config');
 


route.post("/refresh-token", refreshtoken)
route.post("/checksession",keycloak.protect(), checksession)
route.post("/logout",keycloak.protect(), checksession)


module.exports = route