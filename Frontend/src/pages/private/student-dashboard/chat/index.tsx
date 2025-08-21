import React, { useEffect } from "react";
import ChatList from "../../../../components/Chat/ChatList";
import ChatWindow from "../../../../components/Chat/ChatWindow";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../../../store";
import {
  selectConversation,
  clearMessages,
  clearUnreadMessages,
} from "../../../../store/slices/chatSlice";
import { useAuth } from "../../../../context/AuthContext";

const StudentChatPage: React.FC = () => {
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
    // Clear unread messages when entering chat page
    dispatch(clearUnreadMessages());
    localStorage.setItem("unreadMessages", "false");
  }, [conversations, selectedConversation, dispatch]);

  useEffect(() => {
    return () => {
      if (selectedConversation?._id) {
        dispatch(clearMessages(selectedConversation._id));
      }
    };
  }, [dispatch, selectedConversation]);

  if (!user) {
    return <div className="p-4 text-center">Please login to view chat.</div>;
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
                  return;
                }
                if (selectedConversation?._id) {
                  dispatch(clearMessages(selectedConversation._id));
                }
                dispatch(selectConversation(conv));
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
