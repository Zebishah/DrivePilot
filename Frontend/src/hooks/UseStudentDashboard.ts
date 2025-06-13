import { useMemo, useState } from "react";
import { useQuery } from "@apollo/client";
import { useParams } from "react-router-dom";
import { DashboardData, DateFilter } from "../types/Student";
import { GET_STUDENT_DASHBOARD } from "../graphql/Queries/StudentQueries";

export const useStudentDashboard = () => {
  const [selectedTab, setSelectedTab] = useState<"completed" | "uncompleted">(
    "completed"
  );
  const { studentId } = useParams<{ studentId: string }>();
  const [dateFilter, setDateFilter] = useState<DateFilter>("this-month");

  const { loading, error, data } = useQuery<{
    getStudentDashboardDetails: DashboardData;
  }>(GET_STUDENT_DASHBOARD, {
    variables: { studentId },
    skip: !studentId,
    fetchPolicy: "cache-and-network",
  });

  const getDateRange = (filter: DateFilter): { start: Date; end: Date } => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (filter) {
      case "this-week": {
        const startOfThisWeek = new Date(today);
        startOfThisWeek.setDate(today.getDate() - today.getDay());
        const endOfThisWeek = new Date(startOfThisWeek);
        endOfThisWeek.setDate(startOfThisWeek.getDate() + 6);
        return { start: startOfThisWeek, end: endOfThisWeek };
      }
      case "last-week": {
        const startOfLastWeek = new Date(today);
        startOfLastWeek.setDate(today.getDate() - today.getDay() - 7);
        const endOfLastWeek = new Date(startOfLastWeek);
        endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
        return { start: startOfLastWeek, end: endOfLastWeek };
      }
      case "this-month": {
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfThisMonth = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0
        );
        return { start: startOfThisMonth, end: endOfThisMonth };
      }
      case "last-month": {
        const startOfLastMonth = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          1
        );
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        return { start: startOfLastMonth, end: endOfLastMonth };
      }
      default:
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
        };
    }
  };

  const filteredGraphData = useMemo(() => {
    if (!data?.getStudentDashboardDetails.graphStats) return [];

    const { start, end } = getDateRange(dateFilter);

    return data.getStudentDashboardDetails.graphStats.filter((item) => {
      const itemDate = new Date(item.date);
      return itemDate >= start && itemDate <= end;
    });
  }, [data?.getStudentDashboardDetails.graphStats, dateFilter]);

  return {
    selectedTab,
    setSelectedTab,
    dateFilter,
    setDateFilter,
    loading,
    error,
    data,
    filteredGraphData,
  };
};
