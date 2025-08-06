const { Server } = require("socket.io");
const mongoose = require("mongoose");
const Message = mongoose.model("Message");

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

    socket.on("send_message", async (data, callback) => {
      const {
        conversationId,
        senderId,
        receiverId,
        senderModel,
        receiverModel,
        content,
      } = data;
      try {
        // Validate required fields
        if (
          !conversationId ||
          !senderId ||
          !receiverId ||
          !senderModel ||
          !receiverModel ||
          !content
        ) {
          throw new Error("Missing required message fields");
        }

        // Create and save message to MongoDB
        const message = new Message({
          conversationId,
          sender: senderId,
          receiver: receiverId,
          senderModel,
          receiverModel,
          content,
        });
        await message.save();

        // Populate sender and receiver
        const populatedMessage = await Message.findById(message._id)
          .populate("sender", "firstName lastName email profileImage role")
          .populate("receiver", "firstName lastName email profileImage role");

        if (!populatedMessage) {
          throw new Error("Failed to populate message");
        }

        // Prepare message for emission
        const messagePayload = {
          _id: populatedMessage._id.toString(),
          conversationId: populatedMessage.conversationId,
          sender: {
            _id: populatedMessage.sender._id.toString(),
            firstName: populatedMessage.sender.firstName,
            lastName: populatedMessage.sender.lastName,
            name: `${populatedMessage.sender.firstName} ${populatedMessage.sender.lastName}`,
            email: populatedMessage.sender.email,
            profileImage: populatedMessage.sender.profileImage,
            role: populatedMessage.sender.role,
          },
          receiver: {
            _id: populatedMessage.receiver._id.toString(),
            firstName: populatedMessage.receiver.firstName,
            lastName: populatedMessage.receiver.lastName,
            name: `${populatedMessage.receiver.firstName} ${populatedMessage.receiver.lastName}`,
            email: populatedMessage.receiver.email,
            profileImage: populatedMessage.receiver.profileImage,
            role: populatedMessage.receiver.role,
          },
          content: populatedMessage.content,
          createdAt: populatedMessage.createdAt.toISOString(), // Include createdAt
        };

        console.log(
          `📨 Emitting message to room: ${messagePayload.conversationId}`,
          messagePayload
        );
        socket
          .to(messagePayload.conversationId)
          .emit("receive_message", messagePayload);
        socket.emit("receive_message", messagePayload); // Echo to sender

        if (typeof callback === "function") {
          callback({ success: true, messageId: message._id });
        }
      } catch (error) {
        console.error("Error processing message:", error);
        if (typeof callback === "function") {
          callback({ success: false, error: error.message });
        }
      }
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
