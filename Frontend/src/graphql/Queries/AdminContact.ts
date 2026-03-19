import { gql } from "@apollo/client";

export const GET_ALL_CONTACT_DETAILS = gql`
  query GetAllContactDetails {
    getAllContactDetails {
      _id
      supportEmail
      adminId
      createdAt
      updatedAt
    }
  }
`;

export const GET_MY_CONTACT_DETAIL = gql`
  query GetMyContactDetail {
    getMyContactDetail {
      _id
      supportEmail
      adminId
      createdAt
      updatedAt
    }
  }
`;

export const GET_ADMIN_ANALYTICS = gql`
  query GetAdminAnalytics($filter: AnalyticsFilterInput) {
    getAdminAnalytics(filter: $filter) {
      overallStats {
        totalRegistrations
        studentRegistrations
        instructorRegistrations
        totalLessonsBooked
        upcomingLessonsBooked
        completedLessonsBooked
        reviewsGiven
        lessonAttendance
        attendanceRate
        averageReservedHoursPerStudent
      }
      graphData {
        activeUsers {
          time
          students
          instructors
        }
        averageRevenuePerInstructor {
          time
          averageRevenue
        }
        bookingsPerInstructor {
          time
          averageBookings
        }
        totalEarnings {
          time
          totalEarnings
        }
        conversionRates {
          time
          visitors
          registrations
          rate
        }
      }
    }
  }
`;

export const GET_ALL_INSTRUCTORS = gql`
  query GetAllInstructors {
    getAllInstructors {
      _id
      firstName
      lastName
    }
  }
`;
