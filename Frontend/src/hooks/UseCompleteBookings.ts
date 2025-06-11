import { useEffect } from "react";
import { useQuery } from "@apollo/client";
import { GET_COMPLETED_STUDENT_BOOKINGS } from "../graphql/mutations/studentBooking";

export const useCompletedBookings = () => {
  const { data, loading, error, refetch } = useQuery(
    GET_COMPLETED_STUDENT_BOOKINGS,
    {
      fetchPolicy: "cache-and-network",
    }
  );

  useEffect(() => {
    const timer = setInterval(() => {
      // Could add refetch logic here if needed
    }, 60000);
    return () => clearInterval(timer);
  }, [refetch]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    completedBookings: data?.getCompletedStudentBookings || [],
    loading,
    error,
    refetch,
  };
};
