export interface ContactDetail {
  _id: string;
  supportEmail: string;
  adminId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContactDetailInput {
  supportEmail: string;
}

export interface UpdateContactDetailInput {
  id: string;
  supportEmail?: string;
}
export interface ContactInput {
  name: string;
  email: string;
  description: string;
}

export interface ContactResponse {
  success: boolean;
  message: string;
}

export interface SendContactEmailMutation {
  sendContactEmail: ContactResponse;
}

export interface SendContactEmailVariables {
  input: ContactInput;
}
export enum FilterType {
  LAST_WEEK = "LAST_WEEK",
  THIS_WEEK = "THIS_WEEK",
  LAST_MONTH = "LAST_MONTH",
  THIS_MONTH = "THIS_MONTH",
  LAST_YEAR = "LAST_YEAR",
  THIS_YEAR = "THIS_YEAR",
  LAST_6_MONTHS = "LAST_6_MONTHS",
  CUSTOM = "CUSTOM",
}

export interface AnalyticsFilterInput {
  instructorIds?: string[];
  filterType?: FilterType;
  fromDate?: string;
  toDate?: string;
}

export interface OverallStats {
  totalRegistrations: number;
  studentRegistrations?: number;
  instructorRegistrations?: number;
  totalLessonsBooked: number;
  upcomingLessonsBooked?: number;
  completedLessonsBooked?: number;
  reviewsGiven: number;
  lessonAttendance: number;
  attendanceRate: number;
  averageReservedHoursPerStudent?: number;
}

export interface ActiveUserDataPoint {
  time: string;
  students: number;
  instructors: number;
}

export interface RevenueDataPoint {
  time: string;
  averageRevenue: number;
}

export interface BookingDataPoint {
  time: string;
  averageBookings: number;
}

export interface EarningDataPoint {
  time: string;
  totalEarnings: number;
}

export interface ConversionDataPoint {
  time: string;
  visitors: number;
  registrations: number;
  rate: number;
}

export interface GraphData {
  activeUsers: ActiveUserDataPoint[];
  averageRevenuePerInstructor: RevenueDataPoint[];
  bookingsPerInstructor: BookingDataPoint[];
  totalEarnings: EarningDataPoint[];
  conversionRates: ConversionDataPoint[];
}

export interface AdminAnalytics {
  overallStats: OverallStats;
  graphData: GraphData;
}

export interface Instructor {
  _id: string;
  firstName: string;
  lastName: string;
}
