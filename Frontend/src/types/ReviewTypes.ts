export interface SlotDetails {
  date: string;
  startTime: string;
  endTime: string;
  status: string;
}

export interface StudentBookingSlot {
  lessonNumber: string;
  lessonId: string;
  instructorName: string;
  instructorId: string;
  studentId: string;
  dateOfBooking: string;
  slotStatus: string;
  isCompleted: boolean;
  isReviewed: boolean;
  slotId: string;
  slotDetails: SlotDetails;
}

export interface ReviewUser {
  _id: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
}

export interface Review {
  _id: string;
  reviewStatus: string;
  reviewRating?: number;
  reviewDescription?: string;
  studentId: ReviewUser;
  instructorId: ReviewUser;
  lessonId: string;
  slotId: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentInfo {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  profileImage?: string;
  lessonHoursLeft?: string;
}

export interface BookingsBreakdown {
  totalBookings: number;
  completedBookings: number;
  pendingBookings: number;

  totalBookedSlots: number;
  completedSlots: number;
  pendingSlots: number;
}

export interface StudentHoursProgress {
  totalRequiredHours: number;
  completedHours: number;
  remainingHours: number;
  studentInfo: StudentInfo;
  bookingsBreakdown: BookingsBreakdown;
}

export interface CreateReviewInput {
  reviewRating: number;
  reviewDescription: string;
  studentId: string;
  instructorId: string;
  lessonId: string;
  slotId: string;
}

export interface UpdateReviewInput {
  reviewRating?: number;
  reviewDescription?: string;
}

export interface DeleteResponse {
  success: boolean;
  message: string;
}
