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

    // Create a Map to keep only one conversation per instructor
    const uniqueInstructorMap = new Map<string, ConversationType>();

    data.getStudentBookings.forEach((booking: StudentBooking) => {
      const instructor = booking.instructorId;
      if (!instructor || uniqueInstructorMap.has(instructor._id)) return;

      const conversation: ConversationType = {
        _id: instructor._id, // use instructor ID as unique chat ID
        participants: [
          {
            _id: user.id,
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            profileImage: user.profileImage,
            role: user.role, // optionally add role
          },
          {
            _id: instructor._id,
            name: `${instructor.firstName} ${instructor.lastName}`,
            email: instructor.email,
            profileImage:
              instructor.profileImage ||
              `https://ui-avatars.com/api/?name=${instructor.firstName}+${instructor.lastName}`,
            role: instructor.role, // optionally add role
          },
        ],
        user: {
          _id: instructor._id,
          name: `${instructor.firstName} ${instructor.lastName}`,
          email: instructor.email,
          profileImage:
            instructor.profileImage ||
            `https://ui-avatars.com/api/?name=${instructor.firstName}+${instructor.lastName}`,
          role: instructor.role,
        },
      };

      uniqueInstructorMap.set(instructor._id, conversation);
    });

    const uniqueConversations = Array.from(uniqueInstructorMap.values());
    dispatch(setConversations(uniqueConversations));
  }, [data, dispatch, user?.id]);

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
        <ChatWindow conversation={selectedConversation} />
      </div>
    </div>
  );
};

export default StudentChatPage;
