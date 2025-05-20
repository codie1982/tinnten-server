
const Profile = require("../mongoModels/userProfilModel.js");
const Company = require("../mongoModels/companyProfilModel.js");
async function getUserProfile(userid) {

    const profiles = await Profile.findOne({ userid })
        .populate("profileImage")
        .populate({
            path: "accounts",
            populate: {
                path: "packages.packageid",
                model: "system-packages",
                select: ["name", "title", "description", "category", "price", "duration", "discount", "isRenewable"]
            }
        })
        .populate("phones")
        .populate("address")
        .populate("sociallinks");

    return profiles;
}
async function getCompanyProfile(userid) {

    const companies = await Company.find({ "employees.userid": userid, active: true }, {
        phone: 0, industry: 0,
        address: 0, social: 0,
        account: 0, employees: 0,
        taxOrIdentityNumber: 0, employees: 0,
        createdAt: 0, updatedAt: 0,
        __v: 0
    }).populate("logo")
    return companies;
}
module.exports = { getUserProfile, getCompanyProfile };
