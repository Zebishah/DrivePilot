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
import dayjs from "dayjs";

const InstructorChatPage: React.FC = () => {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const { conversations, selectedConversation } = useSelector(
    (state: RootState) => state.chat
  );

  const { data, loading, error } = useQuery(GET_ALL_STUDENTS, {
    variables: {
      filter: {
        sortBy: "RECENT_TO_OLDEST",
      },
    },
    skip: !user?.id,
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      console.log(
        "📥 GET_ALL_STUDENTS response:",
        data?.getAllStudents?.map((s: Student) => ({
          id: s._id,
          name: `${s.firstName} ${s.lastName}`,
          updatedAt: s.updatedAt,
          createdAt: s.createdAt,
        }))
      );
    },
    onError: (err) => {
      console.error("❌ GET_ALL_STUDENTS error:", {
        message: err.message,
        userId: user?.id,
        user,
      });
    },
  });

  useEffect(() => {
    console.log("🔄 useEffect for conversation setup triggered");
    if (!user?.id || !data?.getAllStudents) {
      console.log("⏳ Skipping conversation setup: user or students missing", {
        userId: user?.id,
        students: data?.getAllStudents,
      });
      return;
    }

    const conversationsData = data.getAllStudents
      .filter((student: Student) => student.lessonStats?.totalLessons > 0)
      .map((student: Student) => {
        const studentName = `${student.firstName} ${student.lastName}`;
        const profileImage = student.profileImage?.trim()
          ? student.profileImage
          : `https://ui-avatars.com/api/?name=${encodeURIComponent(
              studentName
            )}`;

        const conversationId = [user.id, student._id].sort().join("_");
        const existingConversation = conversations.find(
          (conv) => conv._id === conversationId
        );

        return {
          _id: conversationId,
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
          updatedAt:
            existingConversation?.lastMessage?.createdAt &&
            dayjs(existingConversation.lastMessage.createdAt).isValid()
              ? existingConversation.lastMessage.createdAt
              : existingConversation?.updatedAt &&
                dayjs(existingConversation.updatedAt).isValid()
              ? existingConversation.updatedAt
              : student.updatedAt && dayjs(student.updatedAt).isValid()
              ? student.updatedAt
              : new Date().toISOString(),
          lastMessage: existingConversation?.lastMessage || undefined,
        } as ConversationType;
      });

    if (JSON.stringify(conversationsData) !== JSON.stringify(conversations)) {
      dispatch(setConversations(conversationsData));
      console.log(
        `✅ Set ${conversationsData.length} conversations`,
        conversationsData.map((c) => ({
          _id: c._id,
          student: c.user.name,
          lastMessageCreatedAt: c.lastMessage?.createdAt,
          updatedAt: c.updatedAt,
          createdAt: c.createdAt,
        }))
      );
    } else {
      console.log("ℹ️ No changes in conversations, skipping dispatch");
    }
  }, [data, dispatch, user]);

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
        createdAt:
          msg.createdAt && dayjs(msg.createdAt).isValid()
            ? msg.createdAt
            : new Date().toISOString(),
      };

      dispatch(
        addMessage({
          conversationId: String(message.conversationId),
          message,
        })
      );
      console.log(
        `📩 Message added to conversation ${message.conversationId}`,
        {
          createdAt: message.createdAt,
          content: message.content,
        }
      );
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

  if (!user) {
    console.error("❌ No user authenticated");
    return <div className="p-4 text-center">Please login to view chat.</div>;
  }

  if (loading) {
    console.log("⏳ Loading students for instructorId:", user.id);
    return <div className="p-4 text-center">Loading chat...</div>;
  }

  if (error) {
    console.error("❌ Error loading students:", error.message);
    return (
      <div className="p-4 text-center text-red-500">
        Error loading chat: {error.message}
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-80px)] p-4 bg-gray-50">
      <div className="flex h-full gap-5">
        <div className="w-[520px] h-full flex-shrink-0 flex flex-col overflow-hidden shadow-md bg-white border-r">
          {conversations.length > 0 ? (
            <ChatList
              conversations={conversations}
              currentUserId={currentUser?._id || ""}
              selectedUserId={selectedConversation?._id}
              onSelect={(conversation) => {
                if (selectedConversation?._id === conversation._id) {
                  console.log(
                    `ℹ️ Conversation ${conversation._id} already selected, skipping`
                  );
                  return;
                }
                if (selectedConversation?._id) {
                  dispatch(clearMessages(selectedConversation._id));
                  console.log(
                    `🧹 Cleared messages for previous conversation: ${selectedConversation._id}`
                  );
                }
                dispatch(selectConversation(conversation));
                console.log(`✅ Selected conversation: ${conversation._id}`);
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              No students found. Students with bookings will appear here.
            </div>
          )}
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
