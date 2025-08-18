export interface InstructorAnalytics {
  instructorId: string;
  name: string;
  email: string;
  address: string;
  studentsCount: number;
  activeBookingsCount: number;
  totalEarnings: number;
  lastBooking: StudentBookingNew | null;
  averageLessonsPerStudent: number;
  cancellationRate: number;
  attendanceRate: number;
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
