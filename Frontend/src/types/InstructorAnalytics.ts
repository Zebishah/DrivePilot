export interface InstructorAnalytics {
  instructorId?: string;
  name?: string;
  email?: string;
  address?: string;
  studentsCount?: number;
  activeBookingsCount?: number;
  totalStudents: number;
  activeBookings: number;
  totalEarnings: number;
  lastBooking: StudentBookingNew | null;
  recentBookings: StudentBookingNew[];
  averageLessonsPerStudent: number;
  cancellationRate: number;
  attendanceRate: number;
  totalLessonsGiven?: number;
  lastLessonDate?: string | null;
  instructor?: Instructor;
}

export interface StudentBookingNew {
  _id: string;
  studentId: UserNew;
  instructorId: Instructor;
  slots: SlotNew[];
  totalAmount: number;
  finalAmount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  studentTotalLessons?: number;
  studentLocation?: string | null;
  studentJoiningDate?: string | null;
  lastAttendanceDate?: string | null;
}

export interface SlotNew {
  date: string;
  startTime: string;
  endTime: string;
  booked: boolean;
  review: boolean;
  status: string;
}

export interface UserNew {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  profileImage?: string;
  createdAt?: string;
}

export interface Instructor {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  profileImage?: string;
}

export interface LocationCoordinates {
  lat: number;
  lng: number;
}
