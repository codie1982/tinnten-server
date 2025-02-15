// Yetkilendirme Middleware (Rol Kontrolü)
function checkRole(role) {
  return (req, res, next) => {
    const token = req.kauth?.grant?.access_token;
    if (!token) {
      return res.status(401).json({ message: "Kimlik doğrulama başarısız" });
    }

    // Realm rollerini al
    const realmRoles = token.content.realm_access?.roles || [];

    // Client rollerini al (Burada "tinnten-client" client ID'sine bakıyoruz)
    const clientRoles = token.content.resource_access?.["tinnten-client"]?.roles || [];


    // Eğer kullanıcı bu role sahipse devam etsin
    if (realmRoles.includes(role) || clientRoles.includes(role)) {
      return next();
    }

    return res.status(403).json({ message: "Yetkisiz erişim" });
  };
}

module.exports = {
    checkRole
}