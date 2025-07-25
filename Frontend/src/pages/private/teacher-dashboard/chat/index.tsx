import React, { useEffect, useMemo } from "react";
import ChatList from "../../../../components/Chat/ChatList";
import ChatWindow from "../../../../components/Chat/ChatWindow";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../../../store";
import {
  setConversations,
  selectConversation,
  clearMessages,
  Conversation as ReduxConversation,
} from "../../../../store/slices/chatSlice";
import { useQuery } from "@apollo/client";
import { GET_ALL_STUDENTS } from "../../../../graphql/Queries/StudentQueries";
import { useAuth } from "../../../../context/AuthContext";
import { UserType } from "../../../../types/chatTypes";

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
      const students: ReduxConversation[] = data.getAllStudents
        .filter(
          (student: any) =>
            student.lessonStats?.totalLessons &&
            student.lessonStats.totalLessons > 0
        )
        .map((student: any) => ({
          _id: student.conversationId || student._id,
          user: {
            _id: student._id,
            name: `${student.firstName} ${student.lastName}`,
            email: student.email,
            profileImage:
              student.profileImage ||
              `https://ui-avatars.com/api/?name=${student.firstName}+${student.lastName}`,
            role: "student",
          },
        }));

      dispatch(setConversations(students));
    }
  }, [data, dispatch]);

  useEffect(() => {
    return () => {
      dispatch(clearMessages());
    };
  }, [dispatch]);

  const currentUser: UserType | null = user
    ? {
        _id: user._id || user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        profileImage:
          user.profileImage ||
          `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}`,
        role: "instructor",
      }
    : null;

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
      <div className="flex h-full rounded-xl shadow-md overflow-hidden bg-white">
        <div className="w-[520px] h-full flex-shrink-0 flex flex-col overflow-hidden bg-white border-r">
          <ChatList
            conversations={conversations}
            currentUserId={currentUser?._id || ""}
            selectedUserId={selectedConversation?._id}
            onSelect={(conversation) => {
              dispatch(clearMessages());
              dispatch(selectConversation(conversation));
            }}
          />
        </div>

        <div className="flex-1 max-w-[calc(100%-340px)] h-full rounded-xl shadow-md bg-white overflow-hidden">
          {" "}
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
