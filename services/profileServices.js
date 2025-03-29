
const Profile = require("../mongoModels/userProfilModel.js");
async function getUserProfile({ userid }) {

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
module.exports = { getUserProfile };
