// Types
interface Document {
  documentType: string;
  documentUrl: string;
}

interface PaymentInfo {
  isPaid: boolean;
  paymentDate?: string;
}

export interface Student {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isProfileComplete: boolean;
  lessonStats?: LessonStats;
  isUserVerified: boolean;
  isUserAuthenticated: boolean;
  authProvider: string;
  createdAt: string;
  updatedAt: string;
  homeAddress?: string;
  location?: string;
  zipCode?: string;
  lessonHoursLeft: string;
  documents?: Document[];
  paymentInfo?: PaymentInfo;
  description?: string;
  experience?: string;
  phone?: string;
  fatherName?: string;
  profileImage?: string;
  dateOfBirth?: string;
  languagePreference?: string[];
}

export enum SortOrder {
  RECENT_TO_OLDEST = "RECENT_TO_OLDEST",
  OLDEST_TO_RECENT = "OLDEST_TO_RECENT",
  A_TO_Z_ORDER = "A_TO_Z_ORDER",
  Z_TO_A_ORDER = "Z_TO_A_ORDER",
  REMAINING_HOURS = "REMAINING_HOURS",
}

export interface StudentFilter {
  sortBy?: SortOrder;
  isProfileComplete?: boolean;
  isUserVerified?: boolean;
  authProvider?: string;
  location?: string;
}
export interface StudentInfo {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  profileImage: string;
  dateOfBirth: string;
  fatherName: string;
  description: string;
  homeAddress: string;
  location: string;
  zipCode: string;
  languagePreference: string[];
}

export interface LessonStats {
  totalLessons: number;
  totalLessonDurationInMinutes: number;
  remainingLessonDurationInMinutes: number;
}

export interface GraphStats {
  date: string;
  lessonsBooked: number;
}

export interface Slot {
  _id: string;
  date: string;
  booked: boolean;
  startTime: string;
  endTime: string;
  status: string;
}

export interface Instructor {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  profileImage: string;
}

export interface Booking {
  _id: string;
  studentId: string;
  instructorId: Instructor;
  slots: Slot[];
  totalAmount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  feedBackStatus?: string;
  bookerProfileImage: string;
}

export interface DashboardData {
  studentInfo: StudentInfo;
  lessonStats: LessonStats;
  graphStats: GraphStats[];
  completedBookings: Booking[];
  uncompletedBookings: Booking[];
}
export type DateFilter =
  | "this-week"
  | "last-week"
  | "this-month"
  | "last-month";
export interface StudentDocument {
  _id: string;
  name: string;
  status: "verified" | "pending" | "rejected";
  url?: string;
}

export interface StudentDetail {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  location?: string;
  address?: string;
  zipCode?: string;
  profileImage?: string;
  documents: StudentDocument[];
  createdAt: string;
  updatedAt: string;
  dateOfBirth?: string;
  languagePreference: string[];
  isUserVerified: boolean;
  lessonCount: number;
  remainingHours: number;
  lastLesson?: string;
}

export interface StudentFilterOptions {
  isVerified?: boolean | "" | undefined;
  lessonCount?: string;
  location?: string;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
}
