const axios = require("axios");

class KeycloakService {
  constructor() {
    this.baseUrl = process.env.KEYCLOAK_BASE_URL;
    this.realm = process.env.REALM;
    this.realm_master = process.env.REALM_MASTER;
    this.adminClientId = process.env.ADMIN_CLIENT_ID;
    this.adminUsername = process.env.ADMIN_USERNAME;
    this.adminPassword = process.env.ADMIN_PASSWORD;
    this.clientId = process.env.CLIENT_ID;
    this.clientSecret = process.env.CLIENT_SECRET;
  }


  /**
     * Keycloak Admin Token Alır
     * @returns {Promise<string>} Admin Access Token
     */
  async getAdminToken() {
    try {
      const response = await axios.post(
        `${this.baseUrl}/realms/master/protocol/openid-connect/token`,
        new URLSearchParams({
          client_id: this.adminClientId,
          username: this.adminUsername,
          password: this.adminPassword,
          grant_type: "password",
        })
      );
      return response.data.access_token;
    } catch (error) {
      console.error("❌ Admin token alınamadı:", error.message);
      throw new Error("Admin token alınamadı.");
    }
  }

  async getClientId(clientName) {
    try {
      const adminToken = await this.getAdminToken();
      const response = await axios.get(
        `${this.baseUrl}/admin/realms/${this.realm}/clients?clientId=${clientName}`,
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      if (response.data.length === 0) throw new Error("Client bulunamadı.");
      return response.data[0].id;
    } catch (error) {
      console.error("❌ İstemci ID alınamadı:", error.message);
      throw new Error("İstemci ID alınamadı.");
    }
  }

  async getRole(clientId, roleName) {
    try {
      const adminToken = await this.getAdminToken();
      const response = await axios.get(
        `${this.baseUrl}/admin/realms/${this.realm}/clients/${clientId}/roles`,
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      return response.data.find((role) => role.name === roleName);
    } catch (error) {
      console.error("❌ Rol alınamadı:", error.message);
      throw new Error("Rol alınamadı.");
    }
  }

  async createUser(email, password, firstName, lastName, attributes = {}) {
    try {
      const adminToken = await this.getAdminToken();
      const response = await axios.post(
        `${this.baseUrl}/admin/realms/${this.realm}/users`,
        {
          email,
          username: email,
          firstName: firstName || email.split("@")[0],
          lastName: lastName || "Kullanıcı",
          enabled: true,
          emailVerified: false,
          requiredActions: [],
          credentials: [{ type: "password", value: password, temporary: false }],
          attributes,
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      if (response.status !== 201) throw new Error("Kullanıcı oluşturulamadı.");
      return true;
    } catch (error) {
      console.error("❌ Kullanıcı oluşturma hatası:", error.message);
      throw new Error("Kullanıcı oluşturulamadı.");
    }
  }
  async createUserWithGoogle(email, password, firstName, lastName, attributes = {}) {
    try {
      const adminToken = await this.getAdminToken();
      const response = await axios.post(
        `${this.baseUrl}/admin/realms/${this.realm}/users`,
        {
          email,
          username: email,
          firstName: firstName || email.split("@")[0],
          lastName: lastName || "Kullanıcı",
          enabled: true,
          emailVerified: true,
          requiredActions: [],
          credentials: [{ type: "password", value: password, temporary: false }],
          attributes,
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      if (response.status !== 201) throw new Error("Kullanıcı oluşturulamadı.");
      return true;
    } catch (error) {
      console.error("❌ Kullanıcı oluşturma hatası:", error.message);
      throw new Error("Kullanıcı oluşturulamadı.");
    }
  }
  async getUserId(email) {
    try {
      const adminToken = await this.getAdminToken();
      const response = await axios.get(
        `${this.baseUrl}/admin/realms/${this.realm}/users?username=${email}`,
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      if (response.data.length === 0) throw new Error("Kullanıcı bulunamadı.");
      return response.data[0].id;
    } catch (error) {
      throw new Error("Kullanıcı bulunamadı.");
    }
  }

  // Yeni: Kullanıcının varlığını kontrol eder
  async isUserExist(email) {
    try {
      const adminToken = await this.getAdminToken();
      const response = await axios.get(
        `${this.baseUrl}/admin/realms/${this.realm}/users?username=${email}`,
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      if (response.data.length > 0) {
        return true
      }
      return false;
    } catch (error) {
      return false;
    }
  }



  async assignRoleToUser(userId, clientId, role) {
    try {
      const adminToken = await this.getAdminToken();
      await axios.post(
        `${this.baseUrl}/admin/realms/${this.realm}/users/${userId}/role-mappings/clients/${clientId}`,
        [role],
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      console.log("✅ Kullanıcıya rol başarıyla atandı.");
    } catch (error) {
      console.error("❌ Kullanıcıya rol atanamadı:", error.message);
      throw new Error("Kullanıcıya rol atanamadı.");
    }
  }

  /**
 * Yeni Bir Grup Oluşturur
 * @param {string} groupName - Oluşturulacak grubun adı
 * @returns {Promise<boolean>} Grup başarıyla oluşturulduysa `true`, aksi halde hata fırlatır
 */
  async createGroup(groupName) {
    try {
      const adminToken = await this.getAdminToken();
      const response = await axios.post(
        `${this.baseUrl}/admin/realms/${this.realm}/groups`,
        { name: groupName },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      if (response.status === 201) {
        console.log(`✅ Grup oluşturuldu: ${groupName}`);
        return true;
      }
      throw new Error("Grup oluşturulamadı.");
    } catch (error) {
      console.error("❌ Grup oluşturma hatası:", error.message);
      throw new Error("Grup oluşturulamadı.");
    }
  }
  /**
* Belirtilen grubun ID'sini alır
* @param {string} groupName - Grup adı
* @returns {Promise<string>} Grup ID'si
*/
  async getGroupId(groupName) {
    try {
      const adminToken = await this.getAdminToken();
      const response = await axios.get(
        `${this.baseUrl}/admin/realms/${this.realm}/groups`,
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      const group = response.data.find((g) => g.name === groupName);
      if (!group) throw new Error("Grup bulunamadı.");
      return group.id;
    } catch (error) {
      console.error("❌ Grup ID alınamadı:", error.message);
      throw new Error("Grup ID alınamadı.");
    }
  }

  /**
 * Kullanıcıyı belirli bir gruba ekler
 * @param {string} userId - Kullanıcının Keycloak ID'si
 * @param {string} groupName - Kullanıcının ekleneceği grup adı
 * @returns {Promise<void>} Başarılı olursa `undefined`, hata olursa exception fırlatır
 */
  async addUserToGroup(userId, groupName) {
    try {
      const adminToken = await this.getAdminToken();
      const groupId = await this.getGroupId(groupName);

      await axios.put(
        `${this.baseUrl}/admin/realms/${this.realm}/users/${userId}/groups/${groupId}`,
        {},
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      console.log(`✅ Kullanıcı gruba eklendi: ${groupName}`);
    } catch (error) {
      console.error("❌ Kullanıcı gruba eklenemedi:", error.message);
      throw new Error("Kullanıcı gruba eklenemedi.");
    }
  }

  /**
   * Kullanıcının şifresini değiştirir
   * @param {string} userId - Kullanıcının Keycloak ID'si
   * @param {string} newPassword - Yeni şifre
   * @returns {Promise<void>} Başarılı olursa `undefined`, hata olursa exception fırlatır
   */
  async changeUserPassword(userId, newPassword) {
    try {
      const adminToken = await this.getAdminToken();

      await axios.put(
        `${this.baseUrl}/admin/realms/${this.realm}/users/${userId}/reset-password`,
        {
          type: "password",
          value: newPassword,
          temporary: false,
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      console.log("✅ Kullanıcının şifresi değiştirildi.");
    } catch (error) {
      console.error("❌ Şifre değiştirilemedi:", error.message);
      throw new Error("Şifre değiştirilemedi.");
    }
  }

  /**
  * Kullanıcının erişim tokenını alır
  * @param {string} email - Kullanıcının e-posta adresi
  * @param {string} password - Kullanıcının şifresi
  * @returns {Promise<object>} Token bilgileri (access_token, refresh_token)
  */
  async getUserToken(email, password,rememberme) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/token`,
        new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          username: email,
          password: password,
          grant_type: "password",
          scope: rememberme ? "openid email offline_access" : "openid email"
        })
      );
      return response.data;
    } catch (error) {
      console.error("❌ Kullanıcı token alınamadı:", error.message);
      throw new Error("Kullanıcı token alınamadı.");
    }
  }

  /**
   * Kullanıcı bilgilerini alır
   * @param {string} accessToken - Kullanıcının erişim tokenı
   * @returns {Promise<object>} 
   * userkey {
      sub: '14c04c75-b3b9-4cde-baef-14a58e083785',
      email_verified: false,
      name: 'Engin EROL',
      preferred_username: 'engin_erol@hotmail.com',
      given_name: 'Engin',
      family_name: 'EROL',
      email: 'engin_erol@hotmail.com'
    }
   */

  async getUserInfo(accessToken) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/userinfo`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      return response.data;
    } catch (error) {
      console.error("❌ Kullanıcı bilgisi alınamadı:", error.message);
      throw new Error("Kullanıcı bilgisi alınamadı.");
    }
  }

  async getUserSessions(userId) {
    try {
      const adminToken = await this.getAdminToken();
      const response = await axios.get(
        `${this.baseUrl}/admin/realms/${this.realm}/users/${userId}/sessions`,
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      return response.data;
    } catch (error) {
      console.error("❌ Kullanıcı oturumları alınamadı:", error.message);
      throw new Error("Kullanıcı oturumları alınamadı.");
    }
  }

  async terminateOldSessions(userId, activeSessions, maxSessions) {
    const adminToken = await this.getAdminToken();
    const sortedSessions = activeSessions.sort((a, b) => new Date(a.start) - new Date(b.start));
    const sessionsToDelete = sortedSessions.slice(0, activeSessions.length - maxSessions);

    for (const session of sessionsToDelete) {
      try {
        await axios.delete(
          `${this.baseUrl}/admin/realms/${this.realm}/users/${userId}/sessions/${session.id}`,
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        console.log(`✅ Session ${session.id} silindi.`);
      } catch (error) {
        console.error(`❌ Session ${session.id} silinemedi:`, error.message);
      }
    }
  }

  /**
 * Kullanıcının Access Token'ını Refresh Token ile yeniler
 * @param {string} refreshToken - Kullanıcının mevcut refresh token'ı
 * @returns {Promise<object>} Yeni token bilgileri (access_token, refresh_token)
 */
  async refreshUserToken(refreshToken) {
    try {
      const tokenUrl = `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/token`;
      const response = await axios.post(tokenUrl,
        new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error("❌ Refresh Token yenileme başarısız:", error.message);
      throw new Error("Refresh Token yenileme başarısız.");
    }
  }

  async validate(accessToken) {
    try {

      const response = await axios.post(
        `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/token/introspect`,
        new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          token: accessToken,
        }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      return response.data.active; // true -> Token geçerli, false -> Token geçersiz
    } catch (error) {
      console.log("error.message", error.message)
      console.error("❌ Access Token doğrulama hatası:", error.message);
      return false;
    }
  }

  /**
   * Kullanıcının e-posta adresini doğrular (emailVerified: true yapar)
   * @param {string} email - Kullanıcının e-posta adresi
   * @returns {Promise<boolean>} Doğrulama başarılı ise true döner, aksi halde hata fırlatır
   */
  async verifyUserEmail(email) {
    try {
      const adminToken = await this.getAdminToken();
      const userId = await this.getUserId(email);
      await axios.put(
        `${this.baseUrl}/admin/realms/${this.realm}/users/${userId}`,
        { emailVerified: true },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      console.log(`✅ ${email} adresi doğrulandı.`);
      return true;
    } catch (error) {
      console.error(`❌ ${email} adresi doğrulanamadı:`, error.message);
      throw new Error("Email doğrulaması başarısız: " + error.message);
    }
  }

    /**
     * Kullanıcının e-posta adresini doğrular (emailVerified: true yapar)
     * @param {string} email - Kullanıcının e-posta adresi
     * @returns {Promise<boolean>} Doğrulama başarılı ise true döner, aksi halde hata fırlatır
     */
    async verifyUserEmail(email) {
      try {
      const adminToken = await this.getAdminToken();
      const userId = await this.getUserId(email);
      await axios.put(
        `${this.baseUrl}/admin/realms/${this.realm}/users/${userId}`,
        { emailVerified: true },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      console.log(`✅ ${email} adresi doğrulandı.`);
      return true;
      } catch (error) {
      console.error(`❌ ${email} adresi doğrulanamadı:`, error.message);
      throw new Error("Email doğrulaması başarısız: " + error.message);
      }
    }

    /**
     * Kullanıcıyı sistemden çıkış yaptırır (logout yapar)
     * @param {string} refreshToken - Kullanıcının refresh token'ı
     * @returns {Promise<boolean>} Çıkış başarılı ise true döner
     */
    async logoutUser(refreshToken) {
      try {
      const response = await axios.post(
        `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/logout`,
        new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );
      console.log("✅ Kullanıcı çıkışı başarılı.");
      return true;
      } catch (error) {
      console.error("❌ Kullanıcı çıkışı yapılamadı:", error.message);
      throw new Error("Kullanıcı çıkışı yapılamadı.");
      }
    }
}

module.exports = new KeycloakService();