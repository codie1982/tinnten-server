const express = require("express")
const route = express.Router()
const { verify, sendcode } = require("../controller/mailController")


route.post("/verify", verify)
route.post("/sendcode", sendcode)
module.exports = route