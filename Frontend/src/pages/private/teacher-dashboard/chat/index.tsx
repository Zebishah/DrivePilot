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
import { ConversationType, UserType } from "../../../../types/chatTypes";
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
    if (!user?.id || !data?.getAllStudents) return;

    const students = data.getAllStudents
      .filter(
        (student: any) =>
          student.lessonStats?.totalLessons &&
          student.lessonStats.totalLessons > 0
      )
      .map((student: any) => {
        const studentName = `${student.firstName} ${student.lastName}`;
        return {
          _id:
            student.conversationId || [user.id, student._id].sort().join("_"),
          participants: [
            {
              _id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              name: `${user.firstName} ${user.lastName}`,
              email: user.email,
              profileImage: user.profileImage,
              role: "instructor",
            },
            {
              _id: student._id,
              firstName: student.firstName,
              lastName: student.lastName,
              name: studentName,
              email: student.email,
              profileImage:
                student.profileImage ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  studentName
                )}`,
              role: "student",
            },
          ],
          user: {
            _id: student._id,
            firstName: student.firstName,
            lastName: student.lastName,
            name: studentName,
            email: student.email,
            profileImage:
              student.profileImage ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                studentName
              )}`,
            role: "student",
          },
          createdAt: student.createdAt || new Date().toISOString(),
          updatedAt: student.updatedAt || new Date().toISOString(),
        };
      });

    dispatch(setConversations(students));
  }, [data, dispatch, user]);

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
      dispatch(
        addMessage({
          conversationId: String(message.conversationId),
          message,
        })
      );
      // Update conversation updatedAt
      const updatedConversations = conversations.map((conv) =>
        conv._id === message.conversationId
          ? { ...conv, updatedAt: new Date().toISOString() }
          : conv
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
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      profileImage: user.profileImage,
      role: "instructor",
    };
  }, [user]);

  const selectedAsConversation = useMemo(() => {
    if (selectedConversation && currentUser) {
      return {
        _id: selectedConversation._id,
        participants: [currentUser, selectedConversation.user],
      };
    }
    return null;
  }, [selectedConversation, currentUser]);

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
