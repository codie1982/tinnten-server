const express = require("express")
const route = express.Router()
const { register,google,googlelogin,createurl, login, refreshtoken,logout,test,validate,sendcode,mailverify } = require("../controller/authController")
const { keycloak, memoryStore } = require('../helpers/keycloak-config');


route.post("/login", login)
route.post("/register", register)
route.get("/google", google)
route.post("/google/login", googlelogin)
route.post("/createurl", createurl)
route.post("/refresh-token", refreshtoken)
route.get("/validate", validate)
route.post("/sendcode",keycloak.protect(),  sendcode)
route.post("/mailverify",keycloak.protect(),  mailverify)
route.post("/logout", keycloak.protect(), logout)
route.post("/test-endpoint", keycloak.protect(), test)


module.exports = route