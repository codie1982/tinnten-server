const express = require("express")
const route = express.Router()
const { lcwRead } = require("../controller/crawlerController")
const { keycloak, memoryStore } = require('../helpers/keycloak-config');


route.post("/lcw", lcwRead)

module.exports = route