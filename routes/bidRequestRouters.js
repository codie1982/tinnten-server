const express = require("express")
const route = express.Router()
const { search, expand, makeform, makeFormFromProducts, getForm,submitOfferResponse, saveFormResponse, updateSettings, completeOfferRequest } = require("../controller/bidController")
const { keycloak, memoryStore } = require('../helpers/keycloak-config');



route.post("/expand", keycloak.protect(), expand)
route.post("/makeform", keycloak.protect(), makeform)
route.post("/makeformfromproducts", keycloak.protect(), makeFormFromProducts)
route.post("/getform", keycloak.protect(), getForm)
route.post("/search", keycloak.protect(), search)
route.post("/saveform", keycloak.protect(), saveFormResponse)
route.post("/update-settings", keycloak.protect(), updateSettings)
route.post("/complete", keycloak.protect(), completeOfferRequest)
route.post("/response", keycloak.protect(), submitOfferResponse)

module.exports = route