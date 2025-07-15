import { useQuery } from "@apollo/client";

import { GET_ALL_STUDENT_BOOKING_SLOTS } from "../graphql/Queries/ReviewQueries";
import { StudentBookingSlot } from "../types/ReviewTypes";

export const useBookingSlots = () => {
  const { data, loading, error, refetch } = useQuery(
    GET_ALL_STUDENT_BOOKING_SLOTS,
    {
      fetchPolicy: "cache-and-network",
      errorPolicy: "all",
    }
  );

  return {
    bookingSlots:
      (data?.getAllStudentBookingSlots as StudentBookingSlot[]) || [],
    loading,
    error,
    refetch,
  };
};
