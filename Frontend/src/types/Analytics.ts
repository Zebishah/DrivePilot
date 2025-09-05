export interface OverallStats {
  totalRegistrations: number;
  totalLessonsBooked: number;
  totalReviewsGiven: number;
  totalLessonsAttendance: number;
  attendanceRate: number;
}

export interface ActiveUsersData {
  time: string;
  activeStudents: number;
  activeInstructors: number;
}

export interface RevenueData {
  time: string;
  revenue: number;
}

export interface BookingData {
  time: string;
  bookings: number;
}

export interface EarningData {
  time: string;
  earnings: number;
}

export interface ConversionData {
  totalVisitors: number;
  registeredUsers: number;
  conversionRate: number;
}

export interface AnalyticsResponse {
  overallStats: OverallStats;
  activeUsersChart: ActiveUsersData[];
  averageRevenueChart: RevenueData[];
  bookingsPerInstructorChart: BookingData[];
  totalEarningsChart: EarningData[];
  conversionRates: ConversionData;
}

export interface DateFilter {
  startDate?: string;
  endDate?: string;
}

export enum QuickFilter {
  LAST_WEEK = "LAST_WEEK",
  THIS_WEEK = "THIS_WEEK",
  LAST_MONTH = "LAST_MONTH",
  CURRENT_MONTH = "CURRENT_MONTH",
  LAST_6_MONTHS = "LAST_6_MONTHS",
  LAST_YEAR = "LAST_YEAR",
  THIS_YEAR = "THIS_YEAR",
}

export interface AnalyticsFilters {
  dateFilter?: DateFilter;
  quickFilter?: QuickFilter;
  instructorIds?: string[];
}

export interface Instructor {
  _id: string;
  firstName: string;
  lastName: string;
}
