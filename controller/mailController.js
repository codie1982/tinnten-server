//General Library
const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs");
var geoip = require('geoip-lite');
const { v4: uuidv4 } = require('uuid');
const { OAuth2Client } = require("google-auth-library");


const User = require("../models/userModel.js");



//helpers
const ApiResponse = require("../helpers/response.js")


//access private
const send_code = asyncHandler(async (req, res) => {
  const { name, email } = await getUserInfo(req.user._id)
  try {
    var data = { name, email, }
    res.status(200)
      .json(ApiResponse.success(data, 200, "Connection Status"))
  } catch (error) {
    console.error("Error reading data:", error);
  }
});
//access private
const verify = asyncHandler(async (req, res) => {
  const { name, email } = "test"
  try {
    var data = { name, email, }
    res.status(200)
      .json(ApiResponse.success(data, 200, "Connection Status"))
  } catch (error) {
    console.error("Error reading data:", error);
  }
});
//access private
const sendcode = asyncHandler(async (req, res) => {
  const { email } = req.body
  try {
    res.status(200)
      .json(ApiResponse.success(200, "send mail is succesful", email))

  } catch (error) {
    console.error("Error reading data:", error);
  }
});


const getUserInfo = async (userid) => {
  return new Promise((resolve, reject) => {
    User.findById({ _id: userid }, '-password')
      .lean()
      .exec((err, result) => {
        if (err) {
          reject(err)
          return;
        }
        resolve(result)
      })
  })
}




module.exports = {
  sendcode, verify
};
