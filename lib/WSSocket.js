const WebSocket = require("ws");

let wssInstance = null;

module.exports = {
  initSocket(server) {
    if (wssInstance) {
      console.log("[socketManager] WebSocket server zaten başlatılmış");
      return wssInstance;
    }

    wssInstance = new WebSocket.Server({
      path: "/stream",
      server,
    });

    console.log("[socketManager] WebSocket server başlatıldı: /stream");

    return wssInstance;
  },

  getWSS() {
    if (!wssInstance) {
      throw new Error("WebSocket server instance is not initialized!");
    }
    return wssInstance;
  },
};