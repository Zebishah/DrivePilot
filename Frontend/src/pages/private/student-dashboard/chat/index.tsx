import React, { useEffect } from "react";
import ChatList from "../../../../components/Chat/ChatList";
import ChatWindow from "../../../../components/Chat/ChatWindow";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../../../store";
import {
  setConversations,
  selectConversation,
  clearMessages,
  addMessage,
} from "../../../../store/slices/chatSlice";
import { useQuery } from "@apollo/client";
import { GET_STUDENT_BOOKINGS } from "../../../../graphql/Queries/StudentQueries";
import { StudentBooking } from "../../../../types/Bookings";
import { useAuth } from "../../../../context/AuthContext";
import { ConversationType, MessageType } from "../../../../types/chatTypes";
import { getSocket } from "../../../../utils/socket";
import dayjs from "dayjs";

const StudentChatPage: React.FC = () => {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const { conversations, selectedConversation } = useSelector(
    (state: RootState) => state.chat
  );

  const { data, loading, error } = useQuery(GET_STUDENT_BOOKINGS, {
    variables: { studentId: user?.id },
    skip: !user?.id,
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      console.log(
        "📥 GET_STUDENT_BOOKINGS response:",
        data?.getStudentBookings?.map((b: StudentBooking) => ({
          id: b._id,
          instructorId: b.instructorId?._id,
          updatedAt: b.updatedAt,
          createdAt: b.createdAt,
        }))
      );
    },
    onError: (err) => {
      console.error("❌ GET_STUDENT_BOOKINGS error:", {
        message: err.message,
        studentId: user?.id,
        user,
      });
    },
  });

  // Create or update conversations from bookings
  useEffect(() => {
    console.log("🔄 useEffect for conversation setup triggered");
    if (!user?.id || !data?.getStudentBookings) {
      console.log("⏳ Skipping conversation setup: user or bookings missing", {
        userId: user?.id,
        bookings: data?.getStudentBookings,
      });
      return;
    }

    const uniqueInstructorMap = new Map<string, ConversationType>();

    data.getStudentBookings.forEach(
      (booking: StudentBooking, index: number) => {
        const instructor = booking.instructorId;
        if (!instructor?._id) {
          console.warn(
            `⚠️ Booking ${index} has no valid instructorId:`,
            booking
          );
          return;
        }

        if (uniqueInstructorMap.has(instructor._id)) {
          console.log(`ℹ️ Skipping duplicate instructor: ${instructor._id}`);
          return;
        }

        const instructorName = `${instructor.firstName || "Unknown"} ${
          instructor.lastName || ""
        }`.trim();
        const profileImage = instructor.profileImage?.trim()
          ? instructor.profileImage
          : `https://ui-avatars.com/api/?name=${encodeURIComponent(
              instructorName || "Instructor"
            )}`;

        const conversationId = [user.id, instructor._id].sort().join("_");
        const existingConversation = conversations.find(
          (conv) => conv._id === conversationId
        );

        const conversation: ConversationType = {
          _id: conversationId,
          participants: [
            {
              _id: user.id,
              firstName: user.firstName || "Student",
              lastName: user.lastName || "",
              name: `${user.firstName || "Student"} ${
                user.lastName || ""
              }`.trim(),
              email: user.email || "",
              profileImage: user.profileImage || "",
              role: user.role || "STUDENT",
            },
            {
              _id: instructor._id,
              firstName: instructor.firstName || "Unknown",
              lastName: instructor.lastName || "",
              name: instructorName,
              email: instructor.email || "",
              profileImage,
              role: instructor.role || "INSTRUCTOR",
            },
          ],
          user: {
            _id: instructor._id,
            firstName: instructor.firstName || "Unknown",
            lastName: instructor.lastName || "",
            name: instructorName,
            email: instructor.email || "",
            profileImage,
            role: instructor.role || "INSTRUCTOR",
          },
          createdAt: booking.createdAt || new Date().toISOString(),
          updatedAt:
            existingConversation?.lastMessage?.createdAt &&
            dayjs(existingConversation.lastMessage.createdAt).isValid()
              ? existingConversation.lastMessage.createdAt
              : existingConversation?.updatedAt &&
                dayjs(existingConversation.updatedAt).isValid()
              ? existingConversation.updatedAt
              : booking.updatedAt && dayjs(booking.updatedAt).isValid()
              ? booking.updatedAt
              : new Date().toISOString(),
          lastMessage: existingConversation?.lastMessage || undefined,
        };

        uniqueInstructorMap.set(instructor._id, conversation);
        console.log(
          `✅ Added/Updated conversation for instructor ${instructor._id}:`,
          {
            _id: conversation._id,
            updatedAt: conversation.updatedAt,
            lastMessageCreatedAt: conversation.lastMessage?.createdAt,
          }
        );
      }
    );

    const newConversations = Array.from(uniqueInstructorMap.values());
    if (newConversations.length === 0) {
      console.warn("⚠️ No conversations created from bookings");
      if (conversations.length > 0) {
        console.log("ℹ️ Keeping existing conversations:", conversations.length);
        return;
      }
    }

    // Only dispatch if conversations have changed
    if (
      JSON.stringify(newConversations) !== JSON.stringify(conversations)
    ) {
      dispatch(setConversations(newConversations));
      console.log(
        `✅ Set ${newConversations.length} conversations`,
        newConversations.map((c) => ({
          _id: c._id,
          user: c.user.name,
          lastMessageCreatedAt: c.lastMessage?.createdAt,
          updatedAt: c.updatedAt,
          createdAt: c.createdAt,
        }))
      );
    } else {
      console.log("ℹ️ No changes in conversations, skipping dispatch");
    }
  }, [data, dispatch, user]);

  // Auto-select the most recent conversation when conversations load
  useEffect(() => {
    if (
      conversations.length > 0 &&
      !selectedConversation &&
      !loading &&
      !error
    ) {
      const mostRecentConversation = conversations[0];
      console.log(
        `✅ Auto-selecting most recent conversation: ${mostRecentConversation._id}`,
        {
          lastMessageCreatedAt: mostRecentConversation.lastMessage?.createdAt,
          updatedAt: mostRecentConversation.updatedAt,
        }
      );
      dispatch(selectConversation(mostRecentConversation));
    }
  }, [conversations, selectedConversation, loading, error, dispatch]);

  // Socket setup for receiving messages
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !conversations.length) {
      console.log("⏳ Skipping socket setup: socket or conversations missing", {
        socket: !!socket,
        conversations: conversations.length,
      });
      return;
    }

    conversations.forEach((conv) => {
      socket.emit(
        "joinConversation",
        conv._id,
        (ack: { success: boolean; room: string }) => {
          if (!ack.success) {
            console.error(`❌ Failed to join room: ${conv._id}`);
          } else {
            console.log(`✅ Joined room: ${conv._id}`);
          }
        }
      );
    });

    const handleReceiveMessage = (msg: any) => {
      if (!msg?.conversationId || !msg?.sender || !msg?.receiver) {
        console.error("❌ Invalid message received:", msg);
        return;
      }

      const message: MessageType = {
        ...msg,
        conversationId: msg.conversationId,
        sender: {
          ...msg.sender,
          name:
            msg.sender.name ||
            `${msg.sender.firstName || "Unknown"} ${
              msg.sender.lastName || ""
            }`.trim(),
        },
        receiver: {
          ...msg.receiver,
          name:
            msg.receiver.name ||
            `${msg.receiver.firstName || "Unknown"} ${
              msg.receiver.lastName || ""
            }`.trim(),
        },
        createdAt: msg.createdAt && dayjs(msg.createdAt).isValid()
          ? msg.createdAt
          : new Date().toISOString(),
      };

      dispatch(
        addMessage({
          conversationId: String(message.conversationId),
          message,
        })
      );
      console.log(`📩 Message added to conversation ${message.conversationId}`, {
        createdAt: message.createdAt,
        content: message.content,
      });
    };

    socket.on("receive_message", handleReceiveMessage);

    return () => {
      conversations.forEach((conv) => {
        socket.emit("leaveConversation", conv._id);
        console.log(`🚪 Left room: ${conv._id}`);
      });
      socket.off("receive_message", handleReceiveMessage);
    };
  }, [conversations, dispatch]);

  // Clear messages when conversation changes
  useEffect(() => {
    return () => {
      if (selectedConversation?._id) {
        dispatch(clearMessages(selectedConversation._id));
        console.log(
          `🧹 Cleared messages for conversation: ${selectedConversation._id}`
        );
      }
    };
  }, [dispatch, selectedConversation]);

  if (!user) {
    console.error("❌ No user authenticated");
    return <div className="p-4 text-center">Please login to view chat.</div>;
  }

  if (loading) {
    console.log("⏳ Loading bookings for studentId:", user.id);
    return <div className="p-4 text-center">Loading chat...</div>;
  }

  if (error) {
    console.error("❌ Error loading bookings:", error.message);
    return (
      <div className="p-4 text-center text-red-500">
        Error loading chat: {error.message}
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-80px)] p-4 bg-gray-50">
      <div className="flex h-full gap-5">
        <div className="w-[520px] h-full rounded-xl shadow-md bg-white overflow-y-auto">
          {conversations.length > 0 ? (
            <ChatList
              conversations={conversations}
              currentUserId={user.id}
              selectedUserId={selectedConversation?._id}
              onSelect={(conv) => {
                if (selectedConversation?._id === conv._id) {
                  console.log(
                    `ℹ️ Conversation ${conv._id} already selected, skipping`
                  );
                  return;
                }
                if (selectedConversation?._id) {
                  dispatch(clearMessages(selectedConversation._id));
                  console.log(
                    `🧹 Cleared messages for previous conversation: ${selectedConversation._id}`
                  );
                }
                dispatch(selectConversation(conv));
                console.log(`✅ Selected conversation: ${conv._id}`);
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              No instructors found. Book a lesson to start chatting.
            </div>
          )}
        </div>
        <div className="flex-1 max-w-[calc(100%-340px)] h-full rounded-xl shadow-md bg-white overflow-hidden">
          {selectedConversation ? (
            <ChatWindow
              key={selectedConversation._id}
              conversation={selectedConversation}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              Select a conversation to start chatting
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentChatPage;