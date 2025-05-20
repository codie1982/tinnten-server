const Keycloak = require("../lib/Keycloak.js");
const User = require("../mongoModels/userModel.js");
const SystemPackage = require("../mongoModels/systemPackageModel.js");
const Account = require("../mongoModels/accountModel.js");
const Profile = require("../mongoModels/userProfilModel.js");
const Images = require("../mongoModels/imagesModel.js")
const { getUserProfile, getCompanyProfile } = require("./profileServices.js");

async function registerUser({ email, device, provider, password, firstName, lastName, picture}) {
    // 1️⃣ İstemci ve rol bilgilerini paralel al
    const [clientId, role] = await Promise.all([
        Keycloak.getClientId(process.env.CLIENT_ID),
        Keycloak.getRole(await Keycloak.getClientId(process.env.CLIENT_ID), "user"),
    ]);

    // 2️⃣ Keycloak üzerinde kullanıcı oluştur (google için email_verified true)
    if (provider === "google") {
        await Keycloak.createUserWithGoogle(email, password, firstName, lastName, { device, provider });
    } else {
        await Keycloak.createUser(email, password, firstName, lastName, { device, provider }, false);
    }

    // 3️⃣ Kullanıcının Keycloak ID'sini al
    const userId = await Keycloak.getUserId(email);

    // 4️⃣ Kullanıcıya rol ata
    await Keycloak.assignRoleToUser(userId, clientId, role);

    // 5️⃣ MongoDB'ye kullanıcı kaydet
    const userDoc = new User({ keyid: userId });
    const nUser = await userDoc.save();
    if (!nUser) throw new Error("Kullanıcı oluşturulamadı.");
    const userid = nUser._id;
    console.log("📌 Kullanıcı DB ID:", userid);

    // 6️⃣ Varsayılan paket bilgilerini ata
    const sPackage = await SystemPackage.findOne({
        forCompany: false,
        default_package: true,
        delete: false,
        status: "active",
    });
    if (!sPackage) throw new Error("Varsayılan paket bulunamadı.");
    const nAccount = await new Account({ userid, packages: [{ packageid: sPackage._id }] }).save();
    let nImages;
    if (picture != null) {
        nImages = await new Images({
            type: "external",
            userid,
            path: picture
        }).save()

    }

    await new Profile({
        userid,
        profileImage: nImages != null ? nImages._id : null,
        accounts: [nAccount._id],
        phones: [],
        address: [],
        sociallinks: [],
    }).save();
}
async function loginUser({ email, password, device, deviceid, userAgent, ip, geo }, rememberme) {
    if (!device) {
        throw new Error("Cihaz bilgisi eksik. (Cihaz türü belirtilmeli: web, mobile, tv)");
    }
    // **1️⃣ Kullanıcı Keycloak'tan JWT Token al**
    const tokenData = await Keycloak.getUserToken(email, password, rememberme);
    const { access_token, refresh_token } = tokenData;

    // **2️⃣ Kullanıcının ID’sini Keycloak üzerinden al**
    const userInfo = await Keycloak.getUserInfo(access_token);

    /*   console.log("userInfo",userInfo)
      if (!userInfo.email_verified) {
          throw new Error("Mail Adresi verify değil.");
      } */

    const userkeyid = userInfo.sub;
    let user = await User.findOne({ keyid: userkeyid });
    if (!user) {
        user = await new User({ keyid: userkeyid }).save();
    }
    const userid = user._id;

    const companyInfo = await getCompanyProfile(userid);

    // **3️⃣ Aktif oturum kontrolü**
    const activeSessions = await Keycloak.getUserSessions(userkeyid);
    let isSameDevice = false;
    let isNewDevice = true;
    activeSessions.forEach((session) => {
        if (session.ipAddress === ip && session.userAgent === userAgent) {
            isSameDevice = true;
        }
        if (session.deviceInfo?.deviceid === deviceid) {
            isNewDevice = false;
        }
    });
    if (isSameDevice) {
        throw new Error("Bu cihazda zaten aktif oturum mevcut.");
    }
    // **4️⃣ Maksimum oturum kontrolü**
    const MAX_SESSIONS = 3;
    if (activeSessions.length > MAX_SESSIONS) {
        await Keycloak.terminateOldSessions(userkeyid, activeSessions, MAX_SESSIONS);
    }
    // **5️⃣ Yeni cihaz bildirimi**
    if (isNewDevice) {
        //await Keycloak.sendDeviceChangeEmail(email, userInfo.name, new Date(), device, userAgent, ip);
    }
    delete userInfo.sub;
    return {
        info: userInfo,
        userid, company: companyInfo,
        accessToken: access_token,
        refreshToken: refresh_token,
        lang: geo ? (geo.country === "TR" ? "TR" : "EN") : "TR"
    };
}
module.exports = { registerUser, loginUser };
