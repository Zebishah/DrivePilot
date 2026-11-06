import { useQuery } from "@apollo/client";
import { GET_STUDENT_HOURS_PROGRESS } from "../graphql/Queries/ReviewQueries";
import { StudentHoursProgress } from "../types/ReviewTypes";

export const useStudentHoursProgress = (studentId: string) => {
  const { data, loading, error, refetch } = useQuery(
    GET_STUDENT_HOURS_PROGRESS,
    {
      variables: { studentId },
      fetchPolicy: "cache-and-network",
      errorPolicy: "all",
    }
  );

  return {
    hoursProgress: data?.getStudentHoursProgress as StudentHoursProgress,
    loading,
    error,
    refetch,
  };
};
