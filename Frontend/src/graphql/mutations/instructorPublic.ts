// src/utils/instructorQueries.js
import { gql } from "@apollo/client";

export const GET_NEARBY_INSTRUCTORS = gql`
  query GetNearbyInstructors(
    $filter: InstructorFilterInput
    $limit: Int
    $offset: Int
  ) {
    getNearbyInstructors(filter: $filter, limit: $limit, offset: $offset) {
      instructors {
        _id
        firstName
        lastName
        location
        rating
        imageUrl
        coordinates
        details {
          degree
          car
          type
          rate
        }
      }
      totalCount
      hasMore
    }
  }
`;

// Utility function to get user's current location
export const getUserLocation = () => {
  return new Promise((resolve, reject) => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve([position.coords.longitude, position.coords.latitude]);
        },
        (error) => {
          console.warn("Geolocation error:", error);
          // Fallback to a default location (e.g., New York City)
          resolve([-74.006, 40.7128]);
        }
      );
    } else {
      // Fallback to a default location if geolocation is not supported
      resolve([-74.006, 40.7128]);
    }
  });
};
