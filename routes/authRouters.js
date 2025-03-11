const express = require("express")
const route = express.Router()
const { register,google,createurl, login, refreshtoken,logout,validate } = require("../controller/authController")
const { keycloak, memoryStore } = require('../helpers/keycloak-config');


route.post("/login", login)
route.post("/register", register)
route.post("/google", google)
route.post("/createurl", createurl)
route.post("/refresh-token", refreshtoken)
route.get("/validate", validate)
route.post("/logout", keycloak.protect(), logout)


module.exports = route