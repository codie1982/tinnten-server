const express = require("express")
const route = express.Router()
const { create, search, conversation, deleteConversation, updateTitle, historyies, detail, answer, deleteQuestion } = require("../controller/llmController/conversationControlller")
const { keycloak, memoryStore } = require('../helpers/keycloak-config');


route.post("/", keycloak.protect(), conversation)
route.put("/answer", keycloak.protect(), answer)
route.put("/title", keycloak.protect(), updateTitle)
route.post("/create", keycloak.protect(), create)
route.get("/search", keycloak.protect(), search)
route.delete("/", keycloak.protect(), deleteConversation)


route.get("/historyies", keycloak.protect(), historyies)
route.get("/:conversationid", keycloak.protect(), detail)


route.delete("/question", keycloak.protect(), deleteQuestion)
module.exports = route