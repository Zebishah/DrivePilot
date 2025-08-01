import { useEffect, useMemo } from "react";
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
import { UserType } from "../../../../types/chatTypes";
import { getSocket } from "../../../../utils/socket";

const InstructorChatPage = () => {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const { conversations, selectedConversation } = useSelector(
    (state: RootState) => state.chat
  );

  const { data } = useQuery(GET_ALL_STUDENTS, {
    fetchPolicy: "network-only",
  });

  useEffect(() => {
    if (data?.getAllStudents) {
      const students = data.getAllStudents
        .filter(
          (student: any) =>
            student.lessonStats?.totalLessons &&
            student.lessonStats.totalLessons > 0
        )
        .map((student: any) => ({
          _id:
            student.conversationId || [user.id, student._id].sort().join("_"),
          user: {
            _id: student._id,
            name: `${student.firstName} ${student.lastName}`,
            email: student.email,
            profileImage:
              student.profileImage ||
              `https://ui-avatars.com/api/?name=${student.firstName}+${student.lastName}`,
            role: "student",
          },
          createdAt: student.createdAt || new Date().toISOString(),
          updatedAt: student.updatedAt || new Date().toISOString(),
        }));

      dispatch(setConversations(students));
    }
  }, [data, dispatch, user?.id]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !conversations.length) return;

    conversations.forEach((conv) => {
      socket.emit(
        "joinConversation",
        conv._id,
        (ack: { success: boolean; room: string }) => {
          if (ack.success) {
            console.log(`InstructorChatPage joined room: ${ack.room}`);
          } else {
            console.error(`Failed to join room: ${conv._id}`);
          }
        }
      );
    });

    const handleReceiveMessage = (msg: any) => {
      console.log("InstructorChatPage received message:", msg);
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

  const currentUser: UserType | null = useMemo(() => {
    if (!user) return null;
    return {
      _id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      profileImage:
        user.profileImage ||
        `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}`,
      role: "instructor",
    };
  }, [user]);

  const selectedAsConversation = useMemo(() => {
    if (selectedConversation && currentUser) {
      const participant1: UserType = {
        _id: currentUser._id,
        name: currentUser.name,
        email: currentUser.email,
        profileImage: currentUser.profileImage,
        role: "instructor",
      };
      const participant2: UserType = {
        _id: selectedConversation.user._id,
        name: selectedConversation.user.name,
        email: selectedConversation.user.email,
        profileImage: selectedConversation.user.profileImage,
        role:
          selectedConversation.user.role === "instructor"
            ? "instructor"
            : "student",
      };
      return {
        _id: selectedConversation._id,
        participants: [participant1, participant2],
      };
    }
    return null;
  }, [selectedConversation, currentUser]);

  return (
    <div className="h-[calc(100vh-80px)] p-4 bg-gray-50">
      <div className="flex h-full gap-5">
        <div className="w-[520px] h-full flex-shrink-0 flex flex-col overflow-hidden shadow-md bg-white border-r">
          <ChatList
            conversations={conversations.map((conv) => ({
              _id: conv._id,
              user: {
                _id: conv.user._id,
                name: conv.user.name,
                email: conv.user.email,
                profileImage: conv.user.profileImage,
                role: conv.user.role || "student",
              },
              createdAt: conv.createdAt,
              updatedAt: conv.updatedAt,
            }))}
            currentUserId={currentUser?._id || ""}
            selectedUserId={selectedConversation?._id}
            onSelect={(conversation) => {
              if (selectedConversation?._id) {
                dispatch(clearMessages(selectedConversation._id));
              }
              const formattedConversation = {
                _id: conversation._id,
                user: {
                  _id: conversation.user._id || "",
                  name: conversation.user.name,
                  email: conversation.user.email || "",
                  profileImage: conversation.user.profileImage || "",
                  role: conversation.user.role || "student",
                },
              };
              dispatch(selectConversation(formattedConversation));
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
