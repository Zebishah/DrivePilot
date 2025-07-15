export interface DashboardStats {
  totalLessons: number;
  bookedLessons: number;
  cancelledLessons: number;
  semiCancelledLessons: number;
  currentBookings: number;
  totalInstructors: number;
  remainingHours: string;
}

export interface SlotLesson {
  lessonId: string;
  instructorId: string;
  instructorName: string;
  date: string;
  startTime: string;
  endTime: string;
  slotStatus: string;
  isCompleted: boolean;
  isReviewed: boolean;
}

export interface Feedback {
  _id: string;
  lessonId: string;
  instructorId: string;
  studentId: string;
  instructorEmail: string;
  feedbackTags: string[];
  hoursRemaining: string;
  message: string;
  createdAt: string;
  updatedAt: string;
}
