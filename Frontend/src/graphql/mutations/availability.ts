import { gql } from "@apollo/client";

// ✅ Query to fetch teacher availability for a given month
export const GET_TEACHER_AVAILABILITY = gql`
  query GetTeacherAvailability($month: String!) {
    teacherAvailability(month: $month) {
      id
      date
      status
      availableSlots {
        id
        date
        startTime
        endTime
        status
        booked
      }
      slots { id date startTime endTime status booked }
    }
  }
`;

// ✅ Mutation to add a new availability slot
export const ADD_AVAILABILITY_SLOT = gql`
  mutation AddAvailabilitySlot($input: TeacherAvailabilityInput!) {
    addAvailabilitySlot(input: $input) {
      id
      date
      status
      availableSlots {
        id
        date
        startTime
        endTime
        status
        booked
      }
    }
  }
`;

// ✅ Mutation to delete an availability slot by ID
export const DELETE_AVAILABILITY_SLOT = gql`
  mutation DeleteAvailabilitySlot($id: ID!) {
    deleteAvailabilitySlot(id: $id)
  }
`;
