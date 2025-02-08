// keycloak-config.js
const Keycloak = require('keycloak-connect');

const KEYCLOAK_BASE_URL = "http://localhost:8080"; // Keycloak URL
const REALM = "tinnten-realm"; // Keycloak Realm adı
const CLIENT_ID = "tinnten-client"; // Keycloak Client ID
const CLIENT_SECRET = "y3P6T54oFpneKZQZdibTmdbKNXSPUwrQ"; // Client Secret (Confidential Clients için)

const keycloak = new Keycloak({ }, {
  clientId: CLIENT_ID,
  bearerOnly: true,
  serverUrl: KEYCLOAK_BASE_URL,
  realm: REALM,
  credentials: {
    secret: CLIENT_SECRET
  }
});

module.exports = { keycloak };