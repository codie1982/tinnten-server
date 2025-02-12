const express = require("express")
const route = express.Router()
const {
    createProfile,
} = require("../controller/accountController")

const { keycloak, memoryStore } = require('../helpers/keycloak-config');



route.post("/", keycloak.protect(), createProfile)


module.exports = route