// keycloak-config.js
const Keycloak = require('keycloak-connect');


const keycloak = new Keycloak({ }, {
  clientId: process.env.CLIENT_ID,
  bearerOnly: true,
  serverUrl: process.env.KEYCLOAK_BASE_URL,
  realm: process.env.REALM,
  credentials: {
    secret: process.env.CLIENT_SECRET
  }
});

module.exports = { keycloak };