const express = require("express")
const route = express.Router()
const {checkRole} = require("../middleware/checkRole")
const {
    getpackages,
    getpackage,
    create,
    update,
    deletePackage,
    harddelete,
    filterpackages } = require("../controller/systemPackagesController")

const { keycloak, memoryStore } = require('../helpers/keycloak-config');


route.get("/", getpackages)
route.get("/:id", getpackage)
route.post("/", keycloak.protect(),checkRole("superman"), create)
route.put("/", keycloak.protect(), update)
route.delete("/:id", keycloak.protect(), deletePackage)
route.delete("/hard-delete/:id",keycloak.protect(), harddelete);
route.get("/filter",keycloak.protect(), filterpackages);

module.exports = route