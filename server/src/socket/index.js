const { Server } = require("socket.io");

const allowedOrigins = [
  "https://dsp-client.onrender.com",
  "https://dsp-server.onrender.com",
  "http://localhost:5173",
  "https://studio.apollographql.com",
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}
if (process.env.Frontend_URL) {
  allowedOrigins.push(process.env.Frontend_URL);
}

// Store socket connections by role
const adminSockets = new Map(); // userId -> socketId
const instructorSockets = new Map(); // instructorId -> socketId
const studentSockets = new Map(); // studentId -> socketId

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

        socket.emit("admin_registered", {
          success: true,
          userId,
          socketId: socket.id,
        });
      }
    });

    // Handle instructor registration
    socket.on("register_instructor", (data) => {
      const { userId, role } = data;
      if (role === "Instructor") {
        instructorSockets.set(userId, socket.id);
        console.log(`👨‍🏫 Instructor registered: ${userId} (${socket.id})`);
        console.log(
          `📊 Total instructors registered: ${instructorSockets.size}`,
        );

        socket.emit("instructor_registered", {
          success: true,
          userId,
          socketId: socket.id,
        });
      }
    });

    // Handle student registration
    socket.on("register_student", (data) => {
      const { userId, role } = data;
      if (role === "Student") {
        studentSockets.set(userId, socket.id);
        console.log(`👨‍🎓 Student registered: ${userId} (${socket.id})`);
        console.log(`📊 Total students registered: ${studentSockets.size}`);

        socket.emit("student_registered", {
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
        message,
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
      const { userId, role } = data;
      console.log(`👀 ${role} ${userId} viewed bookings`);
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

      // Remove from instructor sockets
      for (const [userId, socketId] of instructorSockets.entries()) {
        if (socketId === socket.id) {
          instructorSockets.delete(userId);
          console.log(`👨‍🏫 Instructor ${userId} removed from registry`);
          break;
        }
      }

      // Remove from student sockets
      for (const [userId, socketId] of studentSockets.entries()) {
        if (socketId === socket.id) {
          studentSockets.delete(userId);
          console.log(`👨‍🎓 Student ${userId} removed from registry`);
          break;
        }
      }
    });
  });

  // Expose method to notify about new bookings
  io.notifyNewBooking = (bookingData) => {
    const instructorId =
      bookingData.instructorId?._id || bookingData.instructorId;
    const studentId = bookingData.studentId?._id || bookingData.studentId;

    const bookingInfo = {
      bookingId: bookingData._id,
      studentName:
        `${bookingData.studentId?.firstName || "Student"} ${bookingData.studentId?.lastName || ""}`.trim(),
      instructorName:
        `${bookingData.instructorId?.firstName || "Instructor"} ${bookingData.instructorId?.lastName || ""}`.trim(),
      slotsCount: bookingData.slots?.length || 0,
      createdAt: bookingData.createdAt,
    };

    // 1. Notify all admins
    console.log(`📢 Notifying ${adminSockets.size} admins about new booking`);
    adminSockets.forEach((socketId, userId) => {
      io.to(socketId).emit("new_booking_created", bookingInfo);
    });

    // 2. Notify the specific instructor
    if (instructorId && instructorSockets.has(instructorId)) {
      const instructorSocketId = instructorSockets.get(instructorId);
      console.log(`📢 Notifying instructor ${instructorId} about new booking`);
      io.to(instructorSocketId).emit("instructor_booking_created", bookingInfo);
    } else {
      console.log(`⚠️ Instructor ${instructorId} not connected or not found`);
    }

    // 3. Notify the specific student (confirmation)
    if (studentId && studentSockets.has(studentId)) {
      const studentSocketId = studentSockets.get(studentId);
      console.log(
        `📢 Notifying student ${studentId} about booking confirmation`,
      );
      io.to(studentSocketId).emit("student_booking_confirmed", bookingInfo);
    } else {
      console.log(`⚠️ Student ${studentId} not connected or not found`);
    }
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
