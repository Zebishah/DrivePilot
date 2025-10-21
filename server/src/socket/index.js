const { Server } = require("socket.io");

const allowedOrigins = [
  "https://dsp-client.onrender.com",
  "https://dsp-server.onrender.com",
  "http://localhost:5173",
  "https://studio.apollographql.com",
];

if (process.env.Frontend_URL) {
  allowedOrigins.push(process.env.Frontend_URL);
}

// Store admin socket connections
const adminSockets = new Map();

function initSocket(server) {
  const io = new Server(server, {
    transports: ["polling", "websocket"],
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

    // Handle admin registration
    socket.on("register_admin", (data) => {
      const { userId, role } = data;
      if (role === "Admin") {
        adminSockets.set(userId, socket.id);
        console.log(`👤 Admin registered: ${userId} (${socket.id})`);
        console.log(`📊 Total admins registered: ${adminSockets.size}`);

        // ✅ Send confirmation back to client
        socket.emit("admin_registered", {
          success: true,
          userId,
          socketId: socket.id,
        });
      }
    });

    // Handle chat room joins
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

    // Handle chat messages
    socket.on("send_message", (data) => {
      const message = {
        ...data,
        conversationId: data.conversationId || data.chatId,
      };
      console.log(
        `📨 Emitting message to room: ${message.conversationId}`,
        message
      );
      socket.to(message.conversationId).emit("receive_message", message);
      socket.emit("receive_message", message);
    });

    socket.on("typing", ({ conversationId, from }) => {
      console.log(`✍️ Typing event from ${from} in room: ${conversationId}`);
      socket.to(conversationId).emit("typing", { from, conversationId });
    });

    // Handle booking viewed event
    socket.on("booking_viewed", (data) => {
      const { userId } = data;
      console.log(`👀 Admin ${userId} viewed bookings`);
    });

    socket.on("disconnect", () => {
      console.log("🔌 Client disconnected:", socket.id);
      // Remove from admin sockets
      for (const [userId, socketId] of adminSockets.entries()) {
        if (socketId === socket.id) {
          adminSockets.delete(userId);
          console.log(`👤 Admin ${userId} removed from registry`);
          break;
        }
      }
    });
  });

  // Expose method to notify admins about new bookings
  io.notifyNewBooking = (bookingData) => {
    console.log(`📢 Notifying ${adminSockets.size} admins about new booking`);
    adminSockets.forEach((socketId, userId) => {
      io.to(socketId).emit("new_booking_created", {
        bookingId: bookingData._id,
        studentName: `${bookingData.studentId?.firstName} ${bookingData.studentId?.lastName}`,
        instructorName: `${bookingData.instructorId?.firstName} ${bookingData.instructorId?.lastName}`,
        slotsCount: bookingData.slots?.length || 0,
        createdAt: bookingData.createdAt,
      });
    });
  };

  return io;
}

// Global io instance
let ioInstance = null;

function setIOInstance(io) {
  ioInstance = io;
}

function getIOInstance() {
  return ioInstance;
}

module.exports = { initSocket, setIOInstance, getIOInstance };
