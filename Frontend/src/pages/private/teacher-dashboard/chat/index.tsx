import React, { useEffect } from "react";
import ChatList from "../../../../components/Chat/ChatList";
import ChatWindow from "../../../../components/Chat/ChatWindow";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../../../store/index";
import {
  setConversations,
  selectConversation,
} from "../../../../store/slices/chatSlice";
import { useQuery } from "@apollo/client";
import { GET_ALL_STUDENTS } from "../../../../graphql/Queries/StudentQueries";

const InstructorChatPage = () => {
  const dispatch = useDispatch();
  const { conversations, selectedConversation } = useSelector(
    (state: RootState) => state.chat
  );

  const { data } = useQuery(GET_ALL_STUDENTS, {
    fetchPolicy: "network-only",
  });

  useEffect(() => {
    if (data?.getAllStudents) {
      const students = data.getAllStudents
        .filter((student: any) => student.lessonStats?.totalLessons > 0)
        .map((student: any) => ({
          _id: student._id,
          name: `${student.firstName} ${student.lastName}`,
          email: student.email,
          avatar:
            student.profileImage ||
            `https://ui-avatars.com/api/?name=${student.firstName}+${student.lastName}`,
        }));

      dispatch(setConversations(students));
    }
  }, [data, dispatch]);

  return (
    <div className="flex h-[calc(100vh-80px)]">
      <div className="w-1/3 border-r h-full overflow-y-auto">
        <ChatList
          conversations={conversations}
          currentUserId={null}
          onSelect={(conv) => dispatch(selectConversation(conv))}
        />
      </div>
      <div className="w-2/3 h-full">
        {selectedConversation ? (
          <ChatWindow conversation={selectedConversation} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Select a conversation to start chatting
          </div>
        )}
      </div>
    </div>
  );
};

export default InstructorChatPage;
