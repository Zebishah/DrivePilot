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
        reviewsCount
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
          id
          date
          status
          availableSlots {
            id
            date
            startTime
            endTime
            booked
            status
          }
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
        id
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
        reviewsCount
        profileImage
        carName
        transmissionType
        gender
        languagePreference
      }
      averageRating
      reviewsCount
      tariff {
        lessonFee
        lessonDiscount
        FinalPricePerLesson
        discountStartDate
        discountEndDate
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
        id
        date
        status
        availableSlots {
          id
          date
          startTime
          endTime
          booked
          status
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
