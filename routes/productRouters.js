const express = require("express")
const route = express.Router()
const { getProducts,getProductDetail, addProduct } = require("../controller/productsController")
const { keycloak, memoryStore } = require('../helpers/keycloak-config');


route.post("/", keycloak.protect(), addProduct)
route.get("/:id", keycloak.protect(), getProductDetail)
route.get("/", keycloak.protect(), getProducts)
module.exports = route