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
import { ConversationType } from "../../../../types/chatTypes";
import { getSocket } from "../../../../utils/socket";

const StudentChatPage: React.FC = () => {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const { conversations, selectedConversation } = useSelector(
    (state: RootState) => state.chat
  );

  const { data, loading, error } = useQuery(GET_STUDENT_BOOKINGS, {
    skip: !user?.id,
    fetchPolicy: "network-only",
  });

  useEffect(() => {
    if (!user?.id || !data?.getStudentBookings) return;

    const uniqueInstructorMap = new Map<string, ConversationType>();

    data.getStudentBookings.forEach((booking: StudentBooking) => {
      const instructor = booking.instructorId;
      if (!instructor || uniqueInstructorMap.has(instructor._id)) return;

      const instructorName = `${instructor.firstName} ${instructor.lastName}`;
      const profileImage = instructor.profileImage?.trim()
        ? instructor.profileImage
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(
            instructorName
          )}`;

      const conversation: ConversationType = {
        _id:
          booking.conversationId || [user.id, instructor._id].sort().join("_"),
        participants: [
          {
            _id: user.id,
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            profileImage: user.profileImage,
            role: user.role,
          },
          {
            _id: instructor._id,
            name: instructorName,
            email: instructor.email,
            profileImage,
            role: instructor.role,
          },
        ],
        user: {
          _id: instructor._id,
          name: instructorName,
          email: instructor.email,
          profileImage,
          role: instructor.role,
        },
        createdAt: booking.createdAt || new Date().toISOString(),
        updatedAt: booking.updatedAt || new Date().toISOString(),
      };

      uniqueInstructorMap.set(instructor._id, conversation);
    });

    dispatch(setConversations(Array.from(uniqueInstructorMap.values())));
  }, [data, dispatch, user?.id, user?.email, user?.firstName, user?.lastName]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !conversations.length) return;

    conversations.forEach((conv) => {
      socket.emit(
        "joinConversation",
        conv._id,
        (ack: { success: boolean; room: string }) => {
          if (ack.success) {
            console.log(`StudentChatPage joined room: ${ack.room}`);
          } else {
            console.error(`Failed to join room: ${conv._id}`);
          }
        }
      );
    });

    const handleReceiveMessage = (msg: any) => {
      console.log("StudentChatPage received message:", msg);
      const message: MessageType = {
        ...msg,
        conversationId: msg.conversationId,
      };
      if (
        String(message.conversationId) === String(selectedConversation?._id)
      ) {
        dispatch(
          addMessage({
            conversationId: String(message.conversationId),
            message,
          })
        );
      } else {
        console.log(
          "Message ignored, wrong conversation:",
          message.conversationId,
          selectedConversation?._id
        );
      }
    };

    socket.on("receive_message", handleReceiveMessage);

    return () => {
      conversations.forEach((conv) => {
        socket.emit("leaveConversation", conv._id);
      });
      socket.off("receive_message", handleReceiveMessage);
    };
  }, [conversations, dispatch, selectedConversation?._id]);

  useEffect(() => {
    return () => {
      if (selectedConversation?._id) {
        dispatch(clearMessages(selectedConversation._id));
      }
    };
  }, [dispatch, selectedConversation]);

  if (!user)
    return <div className="p-4 text-center">Please login to view chat.</div>;
  if (loading) return <div className="p-4 text-center">Loading chat...</div>;
  if (error)
    return (
      <div className="p-4 text-center text-red-500">
        Error loading chat: {error.message}
      </div>
    );

  return (
    <div className="h-[calc(100vh-80px)] p-4 bg-gray-50">
      <div className="flex h-full gap-5">
        <div className="w-[520px] h-full rounded-xl shadow-md bg-white overflow-y-auto">
          <ChatList
            conversations={conversations
              .filter((conv) => typeof conv.createdAt === "string")
              .map((conv) => ({
                ...conv,
                createdAt: conv.createdAt ?? new Date().toISOString(),
                updatedAt: conv.updatedAt ?? new Date().toISOString(),
              }))}
            currentUserId={user.id}
            selectedUserId={selectedConversation?._id}
            onSelect={(conv) => {
              if (selectedConversation?._id) {
                dispatch(clearMessages(selectedConversation._id));
              }
              dispatch(selectConversation(conv));
            }}
          />
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
