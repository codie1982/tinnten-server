const express = require("express")
const route = express.Router()
const {checkRole} = require("../middleware/checkRole")
const {
    getpackages,
    getuserpackages,
    getbuisnesspackages,
    getpackage,
    create,
    update,
    deletePackage,
    harddelete,
    filterpackages } = require("../controller/systemPackagesController")

const { keycloak, memoryStore } = require('../helpers/keycloak-config');


route.get("/", getpackages)
route.get("/user", getuserpackages)
route.get("/buisness", getbuisnesspackages)
route.get("/:id", getpackage)
route.post("/", keycloak.protect(),checkRole("superman"), create)
route.put("/", keycloak.protect(),checkRole("superman"), update)
route.delete("/:id", keycloak.protect(),checkRole("superman"), deletePackage)
route.delete("/hard-delete/:id",keycloak.protect(),checkRole("superman"), harddelete);
route.get("/filter",keycloak.protect(), filterpackages);

module.exports = route