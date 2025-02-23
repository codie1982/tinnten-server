const express = require("express")
const route = express.Router()
const { create, conversation, historyies, detail,answer, deleteQuestion } = require("../controller/llmController/conversationControlller")
const { keycloak, memoryStore } = require('../helpers/keycloak-config');


route.post("/", keycloak.protect(), conversation)
route.put("/answer", keycloak.protect(), answer)
route.post("/create", keycloak.protect(), create)


route.get("/historyies", keycloak.protect(), historyies)
route.get("/:conversationid", keycloak.protect(), detail)


route.delete("/question", keycloak.protect(), deleteQuestion)
module.exports = route