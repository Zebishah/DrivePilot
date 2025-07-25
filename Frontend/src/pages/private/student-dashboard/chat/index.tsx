import React, { useEffect } from "react";
import ChatList from "../../../../components/Chat/ChatList";
import ChatWindow from "../../../../components/Chat/ChatWindow";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../../../store";
import {
  setConversations,
  selectConversation,
  clearMessages,
} from "../../../../store/slices/chatSlice";
import { useQuery } from "@apollo/client";
import { GET_STUDENT_BOOKINGS } from "../../../../graphql/Queries/StudentQueries";
import { StudentBooking } from "../../../../types/Bookings";
import { useAuth } from "../../../../context/AuthContext";
import { ConversationType } from "../../../../types/chatTypes";

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
      console.log("isntrucor1", booking);
      const instructor = booking.instructorId;

      if (!instructor || uniqueInstructorMap.has(instructor._id)) return;

      const instructorName = `${instructor.firstName} ${instructor.lastName}`;
      console.log("isntrucor", instructor);
      const profileImage = instructor.profileImage?.trim()
        ? instructor.profileImage
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(
            instructorName
          )}`;

      const conversation: ConversationType = {
        _id: instructor._id,
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

    const uniqueConversations = Array.from(uniqueInstructorMap.values());
    dispatch(setConversations(uniqueConversations));
  }, [data, dispatch, user?.id]);

  useEffect(() => {
    return () => {
      dispatch(clearMessages());
    };
  }, [dispatch]);

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
      <div className="flex h-full rounded-xl shadow-md overflow-hidden bg-white">
        <div className="w-[520px] h-full rounded-xl shadow-md bg-white overflow-y-auto">
          <ChatList
            conversations={conversations}
            currentUserId={user.id}
            onSelect={(conv) => {
              dispatch(clearMessages());
              dispatch(selectConversation(conv));
            }}
            selectedUserId={selectedConversation?._id}
          />
        </div>
        <div className="flex-1 max-w-[calc(100%-340px)] h-full rounded-xl shadow-md bg-white overflow-hidden">
          {selectedConversation ? (
            <ChatWindow conversation={selectedConversation} />
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
