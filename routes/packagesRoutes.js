const express = require("express")
const route = express.Router()
const {
    getPackages,
    getPackage,
    createPackage,
    updatePackage,
    deletePackage} = require("../controller/packagesController")

const { keycloak, memoryStore } = require('../helpers/keycloak-config');




route.get("/", getPackages)
route.get("/:id", getPackage)
route.post("/", createPackage)
route.put("/", updatePackage)
route.delete("/", deletePackage)


module.exports = route