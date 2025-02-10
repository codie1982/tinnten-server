const express = require("express")
const route = express.Router()
const { register, login,info } = require("../controller/usersController")
const { keycloak, memoryStore } = require('../helpers/keycloak-config');
 


route.post("/login", login)
route.post("/register", register)
route.post("/info",keycloak.protect(), info)
module.exports = route