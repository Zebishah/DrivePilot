import { gql } from "@apollo/client";

export const GET_NOTIFICATIONS = gql`
  query GetNotifications($limit: Int, $unreadOnly: Boolean) {
    notifications(limit: $limit, unreadOnly: $unreadOnly) { id type title body entityType entityId readAt createdAt }
  }
`;
export const GET_UNREAD_NOTIFICATION_COUNT = gql`
  query GetUnreadNotificationCount { unreadNotificationCount }
`;
export const MARK_NOTIFICATION_READ = gql`
  mutation MarkNotificationRead($notificationId: ID!) { markNotificationRead(notificationId: $notificationId) { id readAt } }
`;
export const MARK_ALL_NOTIFICATIONS_READ = gql`
  mutation MarkAllNotificationsRead { markAllNotificationsRead }
`;
export const GET_NOTIFICATION_PREFERENCES = gql`
  query GetNotificationPreferences { notificationPreferences { bookingUpdates lessonReminders messages paymentUpdates feedbackNotifications emailNotifications reviews documentStatus } }
`;
export const UPDATE_NOTIFICATION_PREFERENCES = gql`
  mutation UpdateNotificationPreferences($input: NotificationPreferencesInput!) { updateNotificationPreferences(input: $input) { bookingUpdates lessonReminders messages paymentUpdates feedbackNotifications emailNotifications reviews documentStatus } }
`;
export const GET_BOOKING_DETAIL = gql`
  query GetBookingDetail($bookingId: ID!) {
    getBookingDetail(bookingId: $bookingId) { _id status createdAt updatedAt totalAmount finalAmount currency studentId { _id firstName lastName email profileImage } instructorId { _id firstName lastName email profileImage description } slots { _id date startTime endTime status booked paymentStatus chargeAmount refundAmount refundedAt cancellationDate completionMarkedAt cancelledBy rescheduleStatus rescheduleNewDate rescheduleNewStartTime rescheduleNewEndTime } }
  }
`;
export const GET_BOOKING_TIMELINE = gql`
  query GetBookingTimeline($bookingId: ID!) { getBookingTimeline(bookingId: $bookingId) { id bookingId slotId eventType actorId actorRole fromState toState occurredAt } }
`;
export const GET_FAVORITE_INSTRUCTORS = gql`
  query GetFavoriteInstructors { favoriteInstructors { id createdAt instructor { id firstName lastName profileImage location description experience carName transmissionType } } }
`;
export const UNSAVE_INSTRUCTOR = gql`
  mutation UnsaveInstructor($instructorId: ID!) { unsaveInstructor(instructorId: $instructorId) }
`;
export const GET_INSTRUCTOR_STUDENT_DETAIL = gql`
  query GetInstructorStudentDetail($studentId: ID!) { getInstructorStudentDetail(studentId: $studentId) { student { _id firstName lastName email profileImage location } totalLessons completedLessons upcomingLessons historyBookings { _id slots { date startTime endTime status } } } }
`;
export const CANCEL_BOOKING_SLOT = gql`
  mutation CancelBookingSlotFromDetail($bookingId: ID!, $slotId: ID!) { cancelBookingSlot(bookingId: $bookingId, slotId: $slotId) { _id status slots { _id status date startTime endTime } } }
`;
export const REQUEST_RESCHEDULE = gql`
  mutation RequestReschedule($input: RescheduleBookingSlotInput!) { requestReschedule(input: $input) { _id slots { _id status rescheduleStatus rescheduleNewDate rescheduleNewStartTime rescheduleNewEndTime } } }
`;
