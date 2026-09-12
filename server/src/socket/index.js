const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const StudentBooking = require("../models/studentBooking.model");

const allowedOrigins = [
  process.env.FRONTEND_URL || process.env.Frontend_URL || "",
  ...(process.env.NODE_ENV === "production" ? [] : ["http://localhost:5173"]),
].filter(Boolean);

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
      skipMiddlewares: false,
    },
  });

  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token || typeof token !== "string") {
      return next(new Error("Not authenticated"));
    }
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      if (!socket.user?.id || !socket.user?.role) {
        return next(new Error("Invalid authentication token"));
      }
      return next();
    } catch (error) {
      return next(new Error("Invalid authentication token"));
    }
  });

  const roomParticipants = (room) => {
    const parts = String(room || "").split("_");
    return parts.length === 2 && parts[0] && parts[1] ? parts : null;
  };

  const canAccessRoom = async (socket, room) => {
    try {
      const participants = roomParticipants(room);
      if (!participants) return false;
      if (socket.user.role === "Admin") return true;
      if (!participants.includes(String(socket.user.id))) return false;
      const [first, second] = participants;
      return Boolean(
        await StudentBooking.exists({
          $or: [
            { studentId: first, instructorId: second },
            { studentId: second, instructorId: first },
          ],
          status: { $ne: "cancelled" },
        }),
      );
    } catch (error) {
      console.error("[Socket] Failed to authorize conversation room", error.message);
      return false;
    }
  };

  io.on("connection", (socket) => {
    console.log("[Socket] Client connected");

    const registerSocket = (role, eventName) => {
      if (socket.user.role !== role) return;
      const socketMap =
        role === "Admin"
          ? adminSockets
          : role === "Instructor"
            ? instructorSockets
            : studentSockets;
      const userId = String(socket.user.id);
      socketMap.set(userId, socket.id);
      socket.emit(eventName, {
        success: true,
        userId,
        socketId: socket.id,
      });
    };

    // Handle admin registration
    socket.on("register_admin", () => {
      registerSocket("Admin", "admin_registered");
    });

    // Handle instructor registration
    socket.on("register_instructor", () => {
      registerSocket("Instructor", "instructor_registered");
    });

    // Handle student registration
    socket.on("register_student", () => {
      registerSocket("Student", "student_registered");
    });

    // Handle chat room joins
    socket.on("joinConversation", async (room, ack) => {
      if (!(await canAccessRoom(socket, room))) {
        if (typeof ack === "function") ack({ success: false, error: "Not authorized" });
        return;
      }
      socket.join(room);
      console.log("[Socket] Conversation joined");
      if (typeof ack === "function") {
        ack({ success: true, room });
      }
    });

    socket.on("leaveConversation", async (room) => {
      if (!(await canAccessRoom(socket, room))) return;
      socket.leave(room);
      console.log("[Socket] Conversation left");
    });

    // Handle chat messages
    socket.on("send_message", async (data = {}) => {
      const conversationId = data.conversationId || data.chatId;
      const receiverId = data.receiver?._id || data.receiverId;
      const participants = roomParticipants(conversationId);
      if (
        !receiverId ||
        String(data.sender?._id || data.senderId) !== String(socket.user.id) ||
        !participants ||
        !participants.includes(String(receiverId)) ||
        !(await canAccessRoom(socket, conversationId))
      ) {
        socket.emit("chat_error", { message: "Not authorized" });
        return;
      }
      const message = {
        ...data,
        conversationId,
        senderId: String(socket.user.id),
        senderModel: socket.user.role,
        receiverId: String(receiverId),
        sender: data.sender
          ? { ...data.sender, _id: String(socket.user.id) }
          : data.sender,
      };
      socket.to(conversationId).emit("receive_message", message);
      socket.emit("receive_message", message);
    });

    socket.on("typing", async ({ conversationId } = {}) => {
      if (!(await canAccessRoom(socket, conversationId))) return;
      const from = String(socket.user.id);
      socket.to(conversationId).emit("typing", { from, conversationId });
    });

    // Handle booking viewed event
    socket.on("booking_viewed", () => {
      console.log("[Socket] Booking viewed event received");
    });

    socket.on("disconnect", () => {
      console.log("[Socket] Client disconnected");

      // Remove from admin sockets
      for (const [userId, socketId] of adminSockets.entries()) {
        if (socketId === socket.id) {
          adminSockets.delete(String(userId));
          console.log("[Socket] Admin connection removed");
          break;
        }
      }

      // Remove from instructor sockets
      for (const [userId, socketId] of instructorSockets.entries()) {
        if (socketId === socket.id) {
          instructorSockets.delete(String(userId));
          console.log("[Socket] Instructor connection removed");
          break;
        }
      }

      // Remove from student sockets
      for (const [userId, socketId] of studentSockets.entries()) {
        if (socketId === socket.id) {
          studentSockets.delete(String(userId));
          console.log("[Socket] Student connection removed");
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
      console.log("[Socket] Instructor booking notification sent");
      io.to(instructorSocketId).emit("instructor_booking_created", bookingInfo);
    } else {
      console.log("[Socket] Instructor not connected");
    }

    // 3. Notify the specific student (confirmation)
    if (studentId && studentSockets.has(studentId)) {
      const studentSocketId = studentSockets.get(studentId);
      console.log("[Socket] Student booking notification sent");
      io.to(studentSocketId).emit("student_booking_confirmed", bookingInfo);
    } else {
      console.log("[Socket] Student not connected");
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
