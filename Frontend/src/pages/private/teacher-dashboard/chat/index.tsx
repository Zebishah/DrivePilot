import React, { useEffect, useMemo } from "react";
import ChatList from "../../../../components/Chat/ChatList";
import ChatWindow from "../../../../components/Chat/ChatWindow";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../../../store";
import {
  selectConversation,
  clearMessages,
} from "../../../../store/slices/chatSlice";
import { useAuth } from "../../../../context/AuthContext";
import { UserType } from "../../../../types/chatTypes";

const InstructorChatPage: React.FC = () => {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const { conversations, selectedConversation } = useSelector(
    (state: RootState) => state.chat
  );

  useEffect(() => {
    if (conversations.length > 0 && !selectedConversation) {
      const mostRecentConversation = conversations[0];
      dispatch(selectConversation(mostRecentConversation));
    }
  }, [conversations, selectedConversation, dispatch]);

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
    return <div className="p-4 text-center">Please login to view chat.</div>;
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
                  return;
                }
                if (selectedConversation?._id) {
                  dispatch(clearMessages(selectedConversation._id));
                }
                dispatch(selectConversation(conversation));
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
