import React, { useEffect, useMemo } from "react";
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
import { GET_ALL_STUDENTS } from "../../../../graphql/Queries/StudentQueries";
import { useAuth } from "../../../../context/AuthContext";
import {
  ConversationType,
  UserType,
  MessageType,
} from "../../../../types/chatTypes";
import { getSocket } from "../../../../utils/socket";
import { Student } from "../../../../types/Student";

const InstructorChatPage: React.FC = () => {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const { conversations, selectedConversation } = useSelector(
    (state: RootState) => state.chat
  );

  // Fetch students with bookings
  const { data, loading, error } = useQuery(GET_ALL_STUDENTS, {
    variables: {
      filter: {
        sortBy: "RECENT_TO_OLDEST",
      },
    },
    skip: !user?.id,
    fetchPolicy: "network-only",
  });

  // Process students into conversations
  useEffect(() => {
    if (!user?.id || !data?.getAllStudents) return;

    const conversationsData = data.getAllStudents
      .filter((student: Student) => student.lessonStats?.totalLessons > 0)
      .map((student: Student) => {
        const studentName = `${student.firstName} ${student.lastName}`;
        const profileImage = student.profileImage?.trim()
          ? student.profileImage
          : `https://ui-avatars.com/api/?name=${encodeURIComponent(
              studentName
            )}`;

        return {
          _id: [user.id, student._id].sort().join("_"),
          participants: [
            {
              _id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              name: `${user.firstName} ${user.lastName}`,
              email: user.email,
              profileImage: user.profileImage?.trim()
                ? user.profileImage
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    `${user.firstName} ${user.lastName}`
                  )}`,
              role: "instructor",
            },
            {
              _id: student._id,
              firstName: student.firstName,
              lastName: student.lastName,
              name: studentName,
              email: student.email,
              profileImage,
              role: student.role || "student",
            },
          ],
          user: {
            _id: student._id,
            firstName: student.firstName,
            lastName: student.lastName,
            name: studentName,
            email: student.email,
            profileImage,
            role: student.role || "student",
          },
          createdAt: student.createdAt || new Date().toISOString(),
          updatedAt: student.updatedAt || new Date().toISOString(),
          lastMessage: undefined,
        } as ConversationType;
      });

    // Sort conversations by updatedAt (descending)
    const sortedConversations = conversationsData.sort(
      (a: ConversationType, b: ConversationType) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    dispatch(setConversations(sortedConversations));
  }, [data, dispatch, user]);

  // Handle socket for real-time updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !conversations.length) return;

    conversations.forEach((conv) => {
      socket.emit(
        "joinConversation",
        conv._id,
        (ack: { success: boolean; room: string }) => {
          if (ack.success) {
            console.error(`Failed to join room: ${conv._id}`);
          }
        }
      );
    });

    const handleReceiveMessage = (msg: any) => {
      if (!msg?.conversationId || !msg?.sender || !msg?.receiver) {
        console.error("Invalid message received:", msg);
        return;
      }

      const message: MessageType = {
        ...msg,
        conversationId: msg.conversationId,
        sender: {
          ...msg.sender,
          name:
            msg.sender.name || `${msg.sender.firstName} ${msg.sender.lastName}`,
        },
        receiver: {
          ...msg.receiver,
          name:
            msg.receiver.name ||
            `${msg.receiver.firstName} ${msg.receiver.lastName}`,
        },
        createdAt: msg.createdAt || new Date().toISOString(),
      };
      dispatch(
        addMessage({
          conversationId: String(message.conversationId),
          message,
        })
      );
      // Update conversation updatedAt and lastMessage
      const updatedConversations = conversations
        .map((conv) =>
          conv._id === message.conversationId
            ? {
                ...conv,
                updatedAt: message.createdAt,
                lastMessage: {
                  content: message.content,
                  createdAt: message.createdAt,
                  sender: message.sender,
                },
              }
            : conv
        )
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      dispatch(setConversations(updatedConversations));
    };

    socket.on("receive_message", handleReceiveMessage);

    return () => {
      conversations.forEach((conv) => {
        socket.emit("leaveConversation", conv._id);
      });
      socket.off("receive_message", handleReceiveMessage);
    };
  }, [conversations, dispatch]);

  // Cleanup messages on unmount
  useEffect(() => {
    return () => {
      if (selectedConversation?._id) {
        dispatch(clearMessages(selectedConversation._id));
      }
    };
  }, [dispatch, selectedConversation]);

  // Current user memo
  const currentUser: UserType | null = useMemo(() => {
    if (!user) return null;
    return {
      _id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      profileImage: user.profileImage?.trim()
        ? user.profileImage
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(
            `${user.firstName} ${user.lastName}`
          )}`,
      role: "instructor",
    };
  }, [user]);

  // Selected conversation memo
  const selectedAsConversation = useMemo(() => {
    if (selectedConversation && currentUser) {
      return {
        _id: selectedConversation._id,
        participants: [currentUser, selectedConversation.user],
        lastMessage: selectedConversation.lastMessage,
      };
    }
    return null;
  }, [selectedConversation, currentUser]);

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
        <div className="w-[520px] h-full flex-shrink-0 flex flex-col overflow-hidden shadow-md bg-white border-r">
          <ChatList
            conversations={conversations}
            currentUserId={currentUser?._id || ""}
            selectedUserId={selectedConversation?._id}
            onSelect={(conversation) => {
              if (selectedConversation?._id) {
                dispatch(clearMessages(selectedConversation._id));
              }
              dispatch(selectConversation(conversation));
            }}
          />
        </div>
        <div className="flex-1 max-w-[calc(100%-340px)] h-full rounded-xl shadow-md bg-white overflow-hidden">
          {selectedAsConversation ? (
            <ChatWindow
              key={selectedAsConversation._id}
              conversation={selectedAsConversation}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Select a conversation to start chatting
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstructorChatPage;
