const { Server } = require("socket.io");

let io = null;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: true,
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.on("connection", (socket) => {
    socket.on("join", (userId) => {
      if (userId) {
        socket.join(String(userId));
      }
    });

    socket.on("leave", (userId) => {
      if (userId) {
        socket.leave(String(userId));
      }
    });
  });

  return io;
}

function getIo() {
  if (!io) {
    throw new Error("Socket.IO has not been initialized yet.");
  }
  return io;
}

module.exports = { initSocket, getIo };
