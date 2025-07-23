import React, { useEffect } from "react";
import ChatList from "../../../../components/Chat/ChatList";
import ChatWindow from "../../../../components/Chat/ChatWindow";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../../../store";
import {
  setConversations,
  selectConversation,
} from "../../../../store/slices/chatSlice";
import { useQuery } from "@apollo/client";
import { GET_STUDENT_BOOKINGS } from "../../../../graphql/Queries/StudentQueries";
import { StudentBooking } from "../../../../types/Bookings";
import { useAuth } from "../../../../context/AuthContext";

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

    const formattedConversations = data.getStudentBookings
      .filter((booking: StudentBooking) => booking.instructorId)
      .map((booking: StudentBooking) => ({
        _id: booking.instructorId._id,
        name: `${booking.instructorId.firstName} ${booking.instructorId.lastName}`,
        email: booking.instructorId.email,
        avatar:
          booking.instructorId.profileImage ||
          `https://ui-avatars.com/api/?name=${booking.instructorId.firstName}+${booking.instructorId.lastName}`,
      }));

    dispatch(setConversations(formattedConversations));
  }, [data, dispatch, user?.id]);

  if (!user) {
    return <div className="p-4 text-center">Please login to view chat.</div>;
  }

  if (loading) {
    return <div className="p-4 text-center">Loading chat...</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        Error loading chat: {error.message}
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-80px)]">
      <div className="w-1/3 border-r h-full overflow-y-auto">
        <ChatList
          conversations={conversations}
          currentUserId={user.id}
          onSelect={(conv) => dispatch(selectConversation(conv))}
          selectedUserId={selectedConversation?._id}
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

export default StudentChatPage;
