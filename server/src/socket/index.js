const { Server } = require("socket.io");

const allowedOrigins = [
  "https://dsp-client.onrender.com",
  "https://dsp-server.onrender.com",
  "http://localhost:5173",
  "https://studio.apollographql.com",
];

function initSocket(server) {
  const io = new Server(server, {
    transports: ["websocket", "polling"],
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          console.log("❌ Blocked socket by CORS:", origin);
          callback(new Error("Not allowed by CORS"));
        }
      },
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingInterval: 10000,
    pingTimeout: 5000,
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("🔌 Socket connected:", socket.id);

    socket.on("joinConversation", (room, ack) => {
      socket.join(room);
      console.log(`🚪 User ${socket.id} joined room: ${room}`);
      if (typeof ack === "function") {
        ack({ success: true, room });
      }
    });

    socket.on("leaveConversation", (room) => {
      socket.leave(room);
      console.log(`🚪 User ${socket.id} left room: ${room}`);
    });

    socket.on("send_message", (data) => {
      const message = {
        ...data,
        conversationId: data.conversationId || data.chatId,
      };
      console.log(`📨 Emitting message to room: ${message.conversationId}`, message);
      socket.to(message.conversationId).emit("receive_message", message);
      socket.emit("receive_message", message); // Echo to sender
    });

    socket.on("typing", ({ conversationId, from }) => {
      console.log(`✍️ Typing event from ${from} in room: ${conversationId}`);
      socket.to(conversationId).emit("typing", { from, conversationId });
    });

    socket.on("disconnect", () => {
      console.log("🔌 Client disconnected:", socket.id);
    });
  });

  return io;
}

module.exports = { initSocket };