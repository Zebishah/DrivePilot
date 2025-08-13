// src/utils/instructorQueries.js
import { gql } from "@apollo/client";

export const GET_NEARBY_INSTRUCTORS = gql`
  query GetNearbyInstructors($filter: InstructorFilterInput, $offset: Int) {
    getNearbyInstructors(filter: $filter, offset: $offset) {
      instructors {
        _id
        firstName
        lastName
        location
        address
        totalReviews
        verificationStatus
        rating
        profileImage
        description
        coordinates {
          coordinates
        }
        details {
          degree
          car
          type
          rate
          lessonDiscount
        }
        availability {
          _id
          date
          startTime
          endTime
        }
      }
      totalCount
    }
  }
`;

export const GET_INSTRUCTOR_PROFILE = gql`
  query GetInstructorPublicProfile($id: ID!) {
    getInstructorPublicProfile(id: $id) {
      instructor {
        _id
        firstName
        lastName
        email
        phone
        address
        location
        coordinates {
          coordinates
        }
        description
        experience
        rating

        profileImage
        carName
        transmissionType
        gender
        languagePreference
      }
      averageRating
      tariff {
        lessonFee
        lessonDiscount
        FinalPricePerLesson
        bulkPackages {
          title
          lessons
          packageDiscount
          PackageEndDate
          cost
          finalPackagePrice
          studentSave
        }
      }
      availability {
        _id
        date
        startTime
        endTime
        booked
        status
        slots {
          date
          startTime
          endTime
          booked
        }
        hourlySlots {
          id
          date
          startTime
          endTime
          booked
          originalSlotId
        }
      }
    }
  }
`;
// Utility function to get user's current location
export const getUserLocation = (): Promise<[number, number] | null> => {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) {
      console.warn("Geolocation not supported");
      resolve([0, 0]);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Return coordinates as [latitude, longitude]
        resolve([position.coords.latitude, position.coords.longitude]);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          resolve([0, 0]);
        } else {
          console.warn("Geolocation error:", error);
          resolve([0, 0]);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  });
};
