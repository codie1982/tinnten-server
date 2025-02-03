const express = require("express")
const route = express.Router()
const { me } = require("../controller/usersController")


route.get("/me", me)

module.exports = route