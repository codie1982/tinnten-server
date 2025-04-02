// utils/socketManager.js
let ioInstance = null;

module.exports = {
  initSocket(server) {
    const { Server } = require('socket.io');
    ioInstance = new Server(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });
    return ioInstance;
  },

  getIO() {
    if (!ioInstance) {
      throw new Error('Socket.IO instance is not initialized!');
    }
    return ioInstance;
  }
};
