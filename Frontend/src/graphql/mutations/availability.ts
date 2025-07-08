import { gql } from "@apollo/client";

export const GET_TEACHER_AVAILABILITY = gql`
  query GetTeacherAvailability($month: String!) {
    teacherAvailability(month: $month) {
      id
      date
      startTime
      endTime
      status
    }
  }
`;

export const ADD_AVAILABILITY_SLOT = gql`
  mutation AddAvailabilitySlot($input: AvailabilitySlotInput!) {
    addAvailabilitySlot(input: $input) {
      id
      date
      startTime
      endTime
      status
    }
  }
`;

export const DELETE_AVAILABILITY_SLOT = gql`
  mutation DeleteAvailabilitySlot($id: ID!) {
    deleteAvailabilitySlot(id: $id)
  }
`;
