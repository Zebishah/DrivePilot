"use client";

import React, { useCallback, useMemo } from "react";

import type { ReactNode } from "react";
import { useState } from "react";
import { useApolloClient, useQuery } from "@apollo/client/react";
import {
  CalendarIcon,
  FilterIcon,
  Users,
  BookOpen,
  Star,
  TrendingUp,
  X,
  ChevronDown,
  Info,
} from "lucide-react";
import { endOfMonth, format, startOfMonth } from "date-fns";
import dynamic from "next/dynamic";
import {
  GET_ADMIN_ANALYTICS,
  GET_ALL_INSTRUCTORS,
} from "../../../graphql/Queries/AdminContact";
import {
  FilterType,
  type AnalyticsFilterInput,
  type AdminAnalytics,
  type Instructor,
} from "../../../types/AdminContact";
import { Tooltip } from "@mui/material";
// Dynamically import ApexCharts to avoid SSR issues
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

/** Native `title` / `aria-label` on SVG does not show hover hints; MUI Tooltip does. */
function StatInfoTooltip({ text }: { text: string }) {
  return (
    <Tooltip
      title={text}
      arrow
      placement="top"
      enterTouchDelay={0}
      slotProps={{
        tooltip: {
          sx: {
            maxWidth: 300,
            fontSize: "0.8125rem",
            lineHeight: 1.45,
            bgcolor: "rgba(17, 24, 39, 0.92)",
          },
        },
      }}
    >
      {/* Native title is a production-safe fallback if MUI popper styles fail to mount */}
      <span className="inline-flex shrink-0" title={text} aria-label={text}>
        <Info className="h-4 w-4 text-white/80 cursor-help" aria-hidden />
      </span>
    </Tooltip>
  );
}

interface CardProps {
  children: ReactNode;
  className?: string;
}

function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}
    >
      {children}
    </div>
  );
}

function CardHeader({ children, className = "" }: CardProps) {
  return (
    <div className={`px-6 py-4 border-b border-gray-200 ${className}`}>
      {children}
    </div>
  );
}

function CardTitle({ children, className = "" }: CardProps) {
  return (
    <h3 className={`text-lg font-semibold text-gray-900 ${className}`}>
      {children}
    </h3>
  );
}

function CardContent({ children, className = "" }: CardProps) {
  return <div className={`px-6 py-4 ${className}`}>{children}</div>;
}

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm";
  className?: string;
  disabled?: boolean;
}

function Button({
  children,
  onClick,
  variant = "default",
  size = "default",
  className = "",
  disabled = false,
}: ButtonProps) {
  const baseClasses =
    "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

  const variantClasses = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
    ghost: "text-gray-700 hover:bg-gray-100",
  };

  const sizeClasses = {
    default: "h-10 px-4 py-2",
    sm: "h-8 px-3 text-sm",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </button>
  );
}
interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
}
function Select({ value, onValueChange, children }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Helper function to format display text
  const getDisplayText = (value: string) => {
    return value
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const handleToggle = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  }, []);
  const handleItemSelect = (selectedValue: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    console.log("[Select] Item selected:", selectedValue);
    onValueChange(selectedValue);
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".select-container")) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  return (
    <div className="relative select-container">
      <button
        type="button" // Explicitly prevent form submission
        onClick={handleToggle}
        onMouseDown={(e) => e.preventDefault()} // Prevent focus issues
        className="flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{getDisplayText(value)}</span>
        <ChevronDown
          className={`h-4 w-4 opacity-50 transition-transform ${isOpen ? "transform rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <div className="absolute top-full mt-1 z-50 w-full rounded-md border border-gray-200 bg-white shadow-lg max-h-60 overflow-y-auto">
          {React.Children.map(children, (child) => {
            if (React.isValidElement(child) && child.type === SelectItem) {
              return React.cloneElement(
                child as React.ReactElement<SelectItemProps>,
                {
                  onClick: (e: React.MouseEvent) =>
                    handleItemSelect(child.props.value, e),
                },
              );
            }
            return child;
          })}
        </div>
      )}
    </div>
  );
}

interface SelectItemProps {
  value: string;
  children: ReactNode;
  onClick?: (e: React.MouseEvent) => void;
}

function SelectItem({ value, children, onClick }: SelectItemProps) {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("[SelectItem] Clicked:", value);
    onClick?.(e);
  };

  return (
    <div
      onClick={handleClick}
      onMouseDown={(e) => e.preventDefault()} // Prevent focus issues
      className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-gray-100 focus:bg-gray-100 transition-colors"
      role="option"
    >
      {children}
    </div>
  );
}

interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "secondary";
  className?: string;
}

function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  const variantClasses = {
    default: "bg-blue-100 text-blue-800",
    secondary: "bg-gray-100 text-gray-800",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

interface CalendarProps {
  mode: "single";
  selected?: Date;
  onSelect: (date?: Date) => void;
}

function Calendar({ selected, onSelect }: CalendarProps) {
  return (
    <div className="p-3">
      <input
        type="date"
        value={selected ? format(selected, "yyyy-MM-dd") : ""}
        onChange={(e) =>
          onSelect(e.target.value ? new Date(e.target.value) : undefined)
        }
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  icon: ReactNode;
  color: string;
  isPercentage?: boolean;
  subtitle?: string;
  secondarySubtitle?: string;
  tooltip?: string;
}

function StatCard({
  title,
  value,
  icon,
  color,
  isPercentage = false,
  subtitle,
  secondarySubtitle,
  tooltip,
}: StatCardProps) {
  return (
    <Card className={`${color} border-0`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-white/80">{title}</p>
              {tooltip && <StatInfoTooltip text={tooltip} />}
            </div>
            <p className="text-3xl font-bold text-white">
              {isPercentage ? `${value.toFixed(1)}%` : value}
            </p>
            {subtitle !== undefined && (
              <p className="text-xs text-white/80 mt-1">{subtitle}</p>
            )}
            {secondarySubtitle !== undefined && (
              <p className="text-xs text-white/80 mt-0.5">
                {secondarySubtitle}
              </p>
            )}
          </div>
          <div className="text-white/80">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AnalyticsDashboard() {
  const [filters, setFilters] = useState<AnalyticsFilterInput>({
    filterType: FilterType.THIS_MONTH,
  });

  const [selectedInstructors, setSelectedInstructors] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);
  const now = useMemo(() => new Date(), []);
  // NOTE: period dropdowns are per-graph; do not share this state globally

  const {
    data: analyticsData,
    loading: analyticsLoading,
    refetch,
  } = useQuery<{ getAdminAnalytics: AdminAnalytics }>(GET_ADMIN_ANALYTICS, {
    variables: { filter: filters },
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
  });

  const { data: instructorsData, loading: instructorsLoading } = useQuery<{
    getAllInstructors: Instructor[];
  }>(GET_ALL_INSTRUCTORS);

  const instructors = instructorsData?.getAllInstructors || [];
  const apolloClient = useApolloClient();

  const applyFilters = useCallback(() => {
    const newFilters: AnalyticsFilterInput = {
      filterType: filters.filterType,
      instructorIds:
        selectedInstructors.length > 0 ? selectedInstructors : undefined,
    };

    if (
      filters.filterType === FilterType.CUSTOM &&
      dateRange.from &&
      dateRange.to
    ) {
      newFilters.fromDate = format(dateRange.from, "yyyy-MM-dd");
      newFilters.toDate = format(dateRange.to, "yyyy-MM-dd");
    }

    // Global filter should update cards + all graphs.
    // Also clear any per-graph period overrides by syncing them from the global response.
    setFilters(newFilters);
    refetch({ filter: newFilters });
    setIsFilterOpen(false);
  }, [
    filters.filterType,
    selectedInstructors,
    dateRange.from,
    dateRange.to,
    refetch,
  ]);

  const fetchGraphDataForMonthYear = useCallback(
    async (monthStr: string, yearStr: string) => {
      const month = Number(monthStr);
      const year = Number(yearStr);
      if (!Number.isFinite(month) || !Number.isFinite(year)) return null;

      const from = startOfMonth(new Date(year, month, 1));
      const to = endOfMonth(from);

      const filter: AnalyticsFilterInput = {
        filterType: FilterType.CUSTOM,
        fromDate: format(from, "yyyy-MM-dd"),
        toDate: format(to, "yyyy-MM-dd"),
        instructorIds:
          selectedInstructors.length > 0 ? selectedInstructors : undefined,
      };

      const res = await apolloClient.query<{
        getAdminAnalytics: AdminAnalytics;
      }>({
        query: GET_ADMIN_ANALYTICS,
        variables: { filter },
        fetchPolicy: "network-only",
      });

      return res.data?.getAdminAnalytics?.graphData ?? null;
    },
    [apolloClient, selectedInstructors],
  );
  const monthShortLabels = useMemo(
    () => ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    [],
  );

  const fetchAvgRevenueYearMonthwise = useCallback(
    async (yearStr: string) => {
      const monthResults = await Promise.all(
        Array.from({ length: 12 }, async (_, monthIdx) => {
          const gd = await fetchGraphDataForMonthYear(String(monthIdx), yearStr);
          const points = gd?.averageRevenuePerInstructor ?? [];
          const avgRevenue =
            points.length > 0
              ? points.reduce((sum, p) => sum + Number(p.averageRevenue || 0), 0) /
                points.length
              : 0;
          return {
            time: monthShortLabels[monthIdx],
            averageRevenue: Number(avgRevenue.toFixed(2)),
          };
        }),
      );
      return monthResults;
    },
    [fetchGraphDataForMonthYear, monthShortLabels],
  );
  const fetchActiveUsersYearMonthwise = useCallback(
    async (yearStr: string) => {
      const monthResults = await Promise.all(
        Array.from({ length: 12 }, async (_, monthIdx) => {
          const gd = await fetchGraphDataForMonthYear(String(monthIdx), yearStr);
          const points = gd?.activeUsers ?? [];
          const students =
            points.length > 0
              ? points.reduce((sum, p) => sum + Number(p.students || 0), 0) /
                points.length
              : 0;
          const instructors =
            points.length > 0
              ? points.reduce((sum, p) => sum + Number(p.instructors || 0), 0) /
                points.length
              : 0;
          return {
            time: monthShortLabels[monthIdx],
            students: Number(students.toFixed(2)),
            instructors: Number(instructors.toFixed(2)),
          };
        }),
      );
      return monthResults;
    },
    [fetchGraphDataForMonthYear, monthShortLabels],
  );
  const fetchAvgBookingsYearMonthwise = useCallback(
    async (yearStr: string) => {
      const monthResults = await Promise.all(
        Array.from({ length: 12 }, async (_, monthIdx) => {
          const gd = await fetchGraphDataForMonthYear(String(monthIdx), yearStr);
          const points = gd?.bookingsPerInstructor ?? [];
          const avgBookings =
            points.length > 0
              ? points.reduce((sum, p) => sum + Number(p.averageBookings || 0), 0) /
                points.length
              : 0;
          return {
            time: monthShortLabels[monthIdx],
            averageBookings: Number(avgBookings.toFixed(2)),
          };
        }),
      );
      return monthResults;
    },
    [fetchGraphDataForMonthYear, monthShortLabels],
  );
  const fetchTotalEarningsYearMonthwise = useCallback(
    async (yearStr: string) => {
      const monthResults = await Promise.all(
        Array.from({ length: 12 }, async (_, monthIdx) => {
          const gd = await fetchGraphDataForMonthYear(String(monthIdx), yearStr);
          const points = gd?.totalEarnings ?? [];
          const totalEarnings = points.reduce(
            (sum, p) => sum + Number(p.totalEarnings || 0),
            0,
          );
          return {
            time: monthShortLabels[monthIdx],
            totalEarnings: Number(totalEarnings.toFixed(2)),
          };
        }),
      );
      return monthResults;
    },
    [fetchGraphDataForMonthYear, monthShortLabels],
  );

  const PeriodDropdowns = ({
    month,
    year,
    setMonth,
    setYear,
    onChange,
    disableMonth = false,
  }: {
    month: string;
    year: string;
    setMonth: (v: string) => void;
    setYear: (v: string) => void;
    onChange: (m: string, y: string) => void;
    disableMonth?: boolean;
  }) => {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 8 }, (_, i) => String(currentYear - i)); // currentYear .. currentYear-7

    return (
      <div className="flex items-center gap-2">
        <select
          value={month}
          disabled={disableMonth}
          onChange={(e) => {
            const next = e.target.value;
            setMonth(next);
            onChange(next, year);
          }}
          className="h-9 text-sm border border-gray-200 rounded-lg px-3 bg-white shadow-sm hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5FC2D3]/60 focus:border-[#5FC2D3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Select month"
        >
          {months.map((m, idx) => (
            <option key={m} value={String(idx)}>
              {m}
            </option>
          ))}
        </select>
        <select
          value={year}
          onChange={(e) => {
            const next = e.target.value;
            setYear(next);
            onChange(month, next);
          }}
          className="h-9 text-sm border border-gray-200 rounded-lg px-3 bg-white shadow-sm hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5FC2D3]/60 focus:border-[#5FC2D3] transition-colors"
          aria-label="Select year"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const clearFilters = () => {
    const newFilters: AnalyticsFilterInput = { filterType: FilterType.THIS_MONTH };
    setFilters(newFilters);
    setSelectedInstructors([]);
    setDateRange({});
    refetch({ filter: newFilters });
  };

  const toggleInstructor = (instructorId: string) => {
    setSelectedInstructors((prev) =>
      prev.includes(instructorId)
        ? prev.filter((id) => id !== instructorId)
        : [...prev, instructorId],
    );
  };

  const stats = analyticsData?.getAdminAnalytics.overallStats;
  const graphData = analyticsData?.getAdminAnalytics.graphData;

  // Per-graph override state (so changing one graph period won't affect others/cards)
  const [activeUsersGraph, setActiveUsersGraph] = useState(
    graphData?.activeUsers ?? [],
  );
  const [avgRevenueGraph, setAvgRevenueGraph] = useState(
    graphData?.averageRevenuePerInstructor ?? [],
  );
  const [avgBookingsGraph, setAvgBookingsGraph] = useState(
    graphData?.bookingsPerInstructor ?? [],
  );
  const [totalEarningsGraph, setTotalEarningsGraph] = useState(
    graphData?.totalEarnings ?? [],
  );

  const [activeUsersMonth, setActiveUsersMonth] = useState(
    String(now.getMonth()),
  );
  const [activeUsersYear, setActiveUsersYear] = useState(String(now.getFullYear()));
  const [activeUsersViewMode, setActiveUsersViewMode] = useState<
    "monthly" | "yearly_monthwise"
  >("monthly");
  const [avgRevenueMonth, setAvgRevenueMonth] = useState(String(now.getMonth()));
  const [avgRevenueYear, setAvgRevenueYear] = useState(String(now.getFullYear()));
  const [avgRevenueViewMode, setAvgRevenueViewMode] = useState<
    "monthly" | "yearly_monthwise"
  >("monthly");
  const [avgBookingsMonth, setAvgBookingsMonth] = useState(String(now.getMonth()));
  const [avgBookingsYear, setAvgBookingsYear] = useState(String(now.getFullYear()));
  const [avgBookingsViewMode, setAvgBookingsViewMode] = useState<
    "monthly" | "yearly_monthwise"
  >("monthly");
  const [totalEarningsMonth, setTotalEarningsMonth] = useState(String(now.getMonth()));
  const [totalEarningsYear, setTotalEarningsYear] = useState(String(now.getFullYear()));
  const [totalEarningsViewMode, setTotalEarningsViewMode] = useState<
    "monthly" | "yearly_monthwise"
  >("monthly");

  const [isActiveUsersLoading, setIsActiveUsersLoading] = useState(false);
  const [isAvgRevenueLoading, setIsAvgRevenueLoading] = useState(false);
  const [isAvgBookingsLoading, setIsAvgBookingsLoading] = useState(false);
  const [isTotalEarningsLoading, setIsTotalEarningsLoading] = useState(false);

  React.useEffect(() => {
    if (!graphData) return;
    setActiveUsersGraph(graphData.activeUsers ?? []);
    setAvgRevenueGraph(graphData.averageRevenuePerInstructor ?? []);
    setAvgBookingsGraph(graphData.bookingsPerInstructor ?? []);
    setTotalEarningsGraph(graphData.totalEarnings ?? []);
    // Reset per-graph month/year selectors back to "current" after any global filter change,
    // so we don't end up with mixed "global + per-graph" periods.
    const m = String(now.getMonth());
    const y = String(now.getFullYear());
    setActiveUsersMonth(m);
    setActiveUsersYear(y);
    setActiveUsersViewMode("monthly");
    setAvgRevenueMonth(m);
    setAvgRevenueYear(y);
    setAvgRevenueViewMode("monthly");
    setAvgBookingsMonth(m);
    setAvgBookingsYear(y);
    setAvgBookingsViewMode("monthly");
    setTotalEarningsMonth(m);
    setTotalEarningsYear(y);
    setTotalEarningsViewMode("monthly");
    setIsActiveUsersLoading(false);
    setIsAvgRevenueLoading(false);
    setIsAvgBookingsLoading(false);
    setIsTotalEarningsLoading(false);
  }, [graphData, now]);

  // Calculate collective totals from the conversion rates data
  const totalVisitors =
    graphData?.conversionRates.reduce((sum, d) => sum + d.visitors, 0) || 0;
  const totalRegistrations =
    graphData?.conversionRates.reduce((sum, d) => sum + d.registrations, 0) ||
    0;

  if (analyticsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const GraphLoader = ({ height = 300 }: { height?: number }) => (
    <div
      className="w-full flex items-center justify-center"
      style={{ height }}
      aria-label="Loading chart"
    >
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#5FC2D3]" />
    </div>
  );

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Filter Section */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Platform Usage Reports
        </h1>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Button
              variant="outline"
              className="gap-2 bg-transparent"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
            >
              <FilterIcon className="h-4 w-4" />
              Filters
              {(selectedInstructors.length > 0 ||
                filters.filterType !== FilterType.LAST_MONTH) && (
                <Badge variant="secondary" className="ml-2">
                  {selectedInstructors.length +
                    (filters.filterType !== FilterType.LAST_MONTH ? 1 : 0)}
                </Badge>
              )}
            </Button>

            {isFilterOpen && (
              <div className="absolute top-full mt-2 right-0 z-50 w-96 rounded-md border border-gray-200 bg-white shadow-lg p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Filters</h3>
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      Clear All
                    </Button>
                  </div>

                  {/* Quick Filters */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Quick Filter
                    </label>
                    <Select
                      value={filters.filterType ?? FilterType.LAST_MONTH}
                      onValueChange={(value) => {
                        const newFilterType = value as FilterType;
                        setFilters((prev) => ({
                          ...prev,
                          filterType: newFilterType,
                        }));

                        // Only refetch if it's not a custom filter (custom filters need date selection)
                        if (newFilterType !== FilterType.CUSTOM) {
                          // Use setTimeout to batch the state update and refetch
                          setTimeout(() => {
                            refetch({
                              filter: {
                                ...filters,
                                filterType: newFilterType,
                                instructorIds:
                                  selectedInstructors.length > 0
                                    ? selectedInstructors
                                    : undefined,
                              },
                            });
                          }, 0);
                        }
                      }}
                    >
                      {Object.values(FilterType).map((type) => (
                        <SelectItem key={type} value={type}>
                          {type
                            .replace(/_/g, " ")
                            .toLowerCase()
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </SelectItem>
                      ))}
                    </Select>
                  </div>

                  {/* Custom Date Range */}
                  {filters.filterType === FilterType.CUSTOM && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Date Range</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal bg-transparent"
                            onClick={() =>
                              setShowFromDatePicker(!showFromDatePicker)
                            }
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange.from
                              ? format(dateRange.from, "PPP")
                              : "From date"}
                          </Button>
                          {showFromDatePicker && (
                            <div className="absolute top-full mt-1 z-50 bg-white border border-gray-200 rounded-md shadow-lg">
                              <Calendar
                                mode="single"
                                selected={dateRange.from}
                                onSelect={(date) => {
                                  setDateRange((prev) => ({
                                    ...prev,
                                    from: date,
                                  }));
                                  setShowFromDatePicker(false);
                                }}
                              />
                            </div>
                          )}
                        </div>
                        <div className="relative flex-1">
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal bg-transparent"
                            onClick={() =>
                              setShowToDatePicker(!showToDatePicker)
                            }
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange.to
                              ? format(dateRange.to, "PPP")
                              : "To date"}
                          </Button>
                          {showToDatePicker && (
                            <div className="absolute top-full mt-1 z-50 bg-white border border-gray-200 rounded-md shadow-lg">
                              <Calendar
                                mode="single"
                                selected={dateRange.to}
                                onSelect={(date) => {
                                  setDateRange((prev) => ({
                                    ...prev,
                                    to: date,
                                  }));
                                  setShowToDatePicker(false);
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Instructor Filter */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Instructors
                    </label>
                    <div className="max-h-40 overflow-y-auto space-y-2 border rounded-md p-2">
                      {instructorsLoading ? (
                        <div className="text-sm text-gray-500">
                          Loading instructors...
                        </div>
                      ) : (
                        instructors.map((instructor) => (
                          <div
                            key={instructor._id}
                            className="flex items-center space-x-2"
                          >
                            <input
                              type="checkbox"
                              id={instructor._id}
                              checked={selectedInstructors.includes(
                                instructor._id,
                              )}
                              onChange={() => toggleInstructor(instructor._id)}
                              className="rounded border-gray-300"
                            />
                            <label
                              htmlFor={instructor._id}
                              className="text-sm cursor-pointer"
                            >
                              {instructor.firstName} {instructor.lastName}
                            </label>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={applyFilters} className="flex-1">
                      Apply Filters
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsFilterOpen(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active Filters Display */}
      {(selectedInstructors.length > 0 ||
        filters.filterType !== FilterType.LAST_MONTH) && (
        <div className="flex flex-wrap gap-2">
          {filters.filterType !== FilterType.LAST_MONTH && (
            <Badge variant="secondary" className="gap-1">
              {(filters?.filterType || "").replace("_", " ")}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    filterType: FilterType.LAST_MONTH,
                  }))
                }
              />
            </Badge>
          )}
          {selectedInstructors.map((id) => {
            const instructor = instructors.find((i) => i._id === id);
            return instructor ? (
              <Badge key={id} variant="secondary" className="gap-1">
                {instructor.firstName} {instructor.lastName}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => toggleInstructor(id)}
                />
              </Badge>
            ) : null;
          })}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="bg-gradient-to-r from-pink-400 to-pink-500 border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-white/80">
                    Total Registrations
                  </p>
                  <StatInfoTooltip text="Sum of all students and instructors currently registered on DSP." />
                </div>
                <p className="text-3xl font-bold text-white">
                  {stats?.totalRegistrations || 0}
                </p>
                <div className="mt-2 flex flex-col gap-1 text-xs text-white/90">
                  <button
                    type="button"
                    className="text-left underline underline-offset-2 hover:text-white"
                    title="Click to view the full list of registered students."
                    onClick={() => {
                      window.location.href = "/admin-dashboard/StudentManagement";
                    }}
                  >
                    Students ({stats?.studentRegistrations ?? 0})
                  </button>
                  <button
                    type="button"
                    className="text-left underline underline-offset-2 hover:text-white"
                    title="Click to view the full list of registered instructors."
                    onClick={() => {
                      window.location.href =
                        "/admin-dashboard/InstructorManagement";
                    }}
                  >
                    Instructors ({stats?.instructorRegistrations ?? 0})
                  </button>
                </div>
              </div>
              <div className="text-white/80">
                <Users className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-yellow-400 to-yellow-500 border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-white/80">
                    Lessons Booked
                  </p>
                  <StatInfoTooltip text="Total number of lessons booked by students on the platform. This includes both upcoming lessons and lessons already completed." />
                </div>
                <p className="text-3xl font-bold text-white">
                  {stats?.totalLessonsBooked || 0}
                </p>
                <div className="mt-2 flex flex-col gap-1 text-xs text-white/90">
                  <button
                    type="button"
                    className="text-left underline underline-offset-2 hover:text-white"
                    title="Go to Booking Management"
                    onClick={() => {
                      window.location.href =
                        "/admin-dashboard/bookingManagement";
                    }}
                  >
                    Upcoming ({stats?.upcomingLessonsBooked ?? 0})
                  </button>
                  <button
                    type="button"
                    className="text-left underline underline-offset-2 hover:text-white"
                    title="Go to Booking Management"
                    onClick={() => {
                      window.location.href =
                        "/admin-dashboard/bookingManagement";
                    }}
                  >
                    Completed ({stats?.completedLessonsBooked ?? 0})
                  </button>
                </div>
              </div>
              <div className="text-white/80">
                <BookOpen className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>
        <StatCard
          title="Reviews Given"
          value={stats?.reviewsGiven || 0}
          icon={<Star className="h-8 w-8" />}
          color="bg-gradient-to-r from-purple-400 to-purple-500"
        />
        <StatCard
        title="Attendance Rate"
          value={stats?.attendanceRate || 0}
          icon={<TrendingUp className="h-8 w-8" />}
          color="bg-gradient-to-r from-blue-400 to-blue-500"
          isPercentage
        subtitle={`Lessons Attended: ${stats?.lessonAttendance ?? 0}`}
        secondarySubtitle={`Total Lessons Booked: ${
          stats?.totalLessonsBooked ?? 0
        }`}
        tooltip="This percentage shows the number of lessons actually attended by students out of all the lessons they booked."
        />
        <StatCard
          title="Avg Hours Reserved / Student"
          value={
            Number(
              ((stats?.averageReservedHoursPerStudent ?? 0) as number).toFixed(
                1,
              ),
            ) || 0
          }
          icon={<BookOpen className="h-8 w-8" />}
          color="bg-gradient-to-r from-green-400 to-green-500"
          subtitle="Average number of lesson hours each student reserved before obtaining their license."
          tooltip="Total hours of all booked lessons divided by the number of students who booked lessons, within the selected period."
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Users Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Active Users
              <div className="flex items-center gap-2">
                <select
                  value={activeUsersViewMode}
                  onChange={(e) => {
                    const nextMode = e.target.value as
                      | "monthly"
                      | "yearly_monthwise";
                    setActiveUsersViewMode(nextMode);
                    setIsActiveUsersLoading(true);
                    void (async () => {
                      try {
                        if (nextMode === "yearly_monthwise") {
                          const series = await fetchActiveUsersYearMonthwise(
                            activeUsersYear,
                          );
                          setActiveUsersGraph(series as typeof activeUsersGraph);
                        } else {
                          const gd = await fetchGraphDataForMonthYear(
                            activeUsersMonth,
                            activeUsersYear,
                          );
                          setActiveUsersGraph(gd?.activeUsers ?? []);
                        }
                      } finally {
                        setIsActiveUsersLoading(false);
                      }
                    })();
                  }}
                  className="h-9 text-sm border border-gray-200 rounded-lg px-3 bg-white shadow-sm hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5FC2D3]/60 focus:border-[#5FC2D3] transition-colors"
                  aria-label="Select active users view"
                >
                  <option value="monthly">Monthly (days wise)</option>
                  <option value="yearly_monthwise">Yearly (month-wise)</option>
                </select>
                <PeriodDropdowns
                  month={activeUsersMonth}
                  year={activeUsersYear}
                  setMonth={setActiveUsersMonth}
                  setYear={setActiveUsersYear}
                  disableMonth={activeUsersViewMode === "yearly_monthwise"}
                  onChange={async (m, y) => {
                    setIsActiveUsersLoading(true);
                    try {
                      if (activeUsersViewMode === "yearly_monthwise") {
                        const series = await fetchActiveUsersYearMonthwise(y);
                        setActiveUsersGraph(series as typeof activeUsersGraph);
                      } else {
                        const gd = await fetchGraphDataForMonthYear(m, y);
                        setActiveUsersGraph(gd?.activeUsers ?? []);
                      }
                    } finally {
                      setIsActiveUsersLoading(false);
                    }
                  }}
                />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-visible">
            {isActiveUsersLoading ? (
              <GraphLoader height={300} />
            ) : (
              <Chart
                options={{
                  chart: { type: "line" as const, toolbar: { show: false } },
                  colors: ["#008FFBD9", "#FFDB20"],
                  stroke: { curve: "smooth" as const, width: 3 },
                  xaxis: {
                    categories: activeUsersGraph.map((d) => d.time) || [],
                  },
                  legend: { position: "top" as const },
                  grid: { strokeDashArray: 3 },
                  tooltip: {
                    shared: true,
                    intersect: false,
                    custom: ({ series, dataPointIndex, w }) => {
                      const label =
                        w?.globals?.categoryLabels?.[dataPointIndex] ??
                        w?.globals?.labels?.[dataPointIndex] ??
                        "";
                      const students = series?.[0]?.[dataPointIndex] ?? 0;
                      const instructors = series?.[1]?.[dataPointIndex] ?? 0;
                      return `
                        <div style="padding:10px 12px; max-width: 320px; white-space: normal;">
                          <div style="font-weight:600; margin-bottom:6px;">${label}</div>
                          <div style="font-size:12px; margin-bottom:6px;">
                            Students (paid ≥ 1 lesson): <b>${students}</b><br/>
                            Instructors (delivered ≥ 1 paid lesson): <b>${instructors}</b>
                          </div>
                          <div style="font-size:11px; color:#6b7280;">
                            Shows students who booked & paid for lessons and instructors who completed at least one paid lesson, over the selected time range.
                          </div>
                        </div>
                      `;
                    },
                  },
                }}
                series={[
                  {
                    name: "Students(Active)",
                    data:
                      activeUsersGraph.map((d) => Math.round(d.students)) || [],
                  },
                  {
                    name: "Instructor(Active)",
                    data:
                      activeUsersGraph.map((d) =>
                        Math.round(d.instructors),
                      ) || [],
                  },
                ]}
                type="line"
                height={300}
              />
            )}
          </CardContent>
        </Card>

        {/* Average Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Average Revenue per Instructor
              <div className="flex items-center gap-2">
                <select
                  value={avgRevenueViewMode}
                  onChange={(e) => {
                    const nextMode = e.target.value as
                      | "monthly"
                      | "yearly_monthwise";
                    setAvgRevenueViewMode(nextMode);
                    setIsAvgRevenueLoading(true);
                    void (async () => {
                      try {
                        if (nextMode === "yearly_monthwise") {
                          const series = await fetchAvgRevenueYearMonthwise(
                            avgRevenueYear,
                          );
                          setAvgRevenueGraph(series as typeof avgRevenueGraph);
                        } else {
                          const gd = await fetchGraphDataForMonthYear(
                            avgRevenueMonth,
                            avgRevenueYear,
                          );
                          if (gd?.averageRevenuePerInstructor) {
                            setAvgRevenueGraph(gd.averageRevenuePerInstructor);
                          } else {
                            setAvgRevenueGraph([]);
                          }
                        }
                      } finally {
                        setIsAvgRevenueLoading(false);
                      }
                    })();
                  }}
                  className="h-9 text-sm border border-gray-200 rounded-lg px-3 bg-white shadow-sm hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5FC2D3]/60 focus:border-[#5FC2D3] transition-colors"
                  aria-label="Select average revenue view"
                >
                  <option value="monthly">Monthly (days wise)</option>
                  <option value="yearly_monthwise">Yearly (month-wise)</option>
                </select>
                <PeriodDropdowns
                  month={avgRevenueMonth}
                  year={avgRevenueYear}
                  setMonth={setAvgRevenueMonth}
                  setYear={setAvgRevenueYear}
                  disableMonth={avgRevenueViewMode === "yearly_monthwise"}
                  onChange={async (m, y) => {
                    setIsAvgRevenueLoading(true);
                    try {
                      if (avgRevenueViewMode === "yearly_monthwise") {
                        const series = await fetchAvgRevenueYearMonthwise(y);
                        setAvgRevenueGraph(series as typeof avgRevenueGraph);
                      } else {
                        const gd = await fetchGraphDataForMonthYear(m, y);
                        if (gd?.averageRevenuePerInstructor)
                          setAvgRevenueGraph(gd.averageRevenuePerInstructor);
                        else setAvgRevenueGraph([]);
                      }
                    } finally {
                      setIsAvgRevenueLoading(false);
                    }
                  }}
                />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-visible">
            {isAvgRevenueLoading ? (
              <GraphLoader height={300} />
            ) : (
              <Chart
                options={{
                  chart: {
                    type: "bar" as const,
                    toolbar: { show: true },
                    zoom: { enabled: true },
                  },
                  colors: ["#8DF9A5"],
                  xaxis: {
                    type: "category", // ✅ required for zooming
                    categories: avgRevenueGraph.map((d) => d.time) || [],
                  },
                  plotOptions: { bar: { borderRadius: 4 } },
                  dataLabels: { enabled: false }, // 🔥 turn off labels on bars
                  tooltip: {
                    y: {
                      formatter: (val: number) => `CHF ${Number(val).toFixed(2)}`,
                    },
                    custom: ({ series, dataPointIndex, w }) => {
                      const label =
                        w?.globals?.categoryLabels?.[dataPointIndex] ??
                        w?.globals?.labels?.[dataPointIndex] ??
                        "";
                      const value = series?.[0]?.[dataPointIndex] ?? 0;
                      return `
                        <div style="padding:10px 12px; max-width: 320px; white-space: normal;">
                          <div style="font-weight:600; margin-bottom:6px;">${label}</div>
                          <div style="font-size:12px; margin-bottom:6px;">
                            Average revenue per instructor: <b>CHF ${Number(value).toFixed(2)}</b>
                          </div>
                          <div style="font-size:11px; color:#6b7280;">
                            Shows the average money earned by instructors (after commission) during the selected period.
                          </div>
                        </div>
                      `;
                    },
                  },
                }}
                series={[
                  {
                    name: "Revenue per Instructor",
                    data:
                      avgRevenueGraph.map((d) =>
                        Math.round(d.averageRevenue),
                      ) || [],
                  },
                ]}
                type="bar"
                height={300}
              />
            )}
          </CardContent>
        </Card>

        {/* Average Bookings per Instructor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Average Bookings per Instructor
              <div className="flex items-center gap-2">
                <select
                  value={avgBookingsViewMode}
                  onChange={(e) => {
                    const nextMode = e.target.value as
                      | "monthly"
                      | "yearly_monthwise";
                    setAvgBookingsViewMode(nextMode);
                    setIsAvgBookingsLoading(true);
                    void (async () => {
                      try {
                        if (nextMode === "yearly_monthwise") {
                          const series = await fetchAvgBookingsYearMonthwise(
                            avgBookingsYear,
                          );
                          setAvgBookingsGraph(series as typeof avgBookingsGraph);
                        } else {
                          const gd = await fetchGraphDataForMonthYear(
                            avgBookingsMonth,
                            avgBookingsYear,
                          );
                          setAvgBookingsGraph(gd?.bookingsPerInstructor ?? []);
                        }
                      } finally {
                        setIsAvgBookingsLoading(false);
                      }
                    })();
                  }}
                  className="h-9 text-sm border border-gray-200 rounded-lg px-3 bg-white shadow-sm hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5FC2D3]/60 focus:border-[#5FC2D3] transition-colors"
                  aria-label="Select average bookings view"
                >
                  <option value="monthly">Monthly (days wise)</option>
                  <option value="yearly_monthwise">Yearly (month-wise)</option>
                </select>
                <PeriodDropdowns
                  month={avgBookingsMonth}
                  year={avgBookingsYear}
                  setMonth={setAvgBookingsMonth}
                  setYear={setAvgBookingsYear}
                  disableMonth={avgBookingsViewMode === "yearly_monthwise"}
                  onChange={async (m, y) => {
                    setIsAvgBookingsLoading(true);
                    try {
                      if (avgBookingsViewMode === "yearly_monthwise") {
                        const series = await fetchAvgBookingsYearMonthwise(y);
                        setAvgBookingsGraph(series as typeof avgBookingsGraph);
                      } else {
                        const gd = await fetchGraphDataForMonthYear(m, y);
                        setAvgBookingsGraph(gd?.bookingsPerInstructor ?? []);
                      }
                    } finally {
                      setIsAvgBookingsLoading(false);
                    }
                  }}
                />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-visible">
            {isAvgBookingsLoading ? (
              <GraphLoader height={300} />
            ) : (
              <Chart
                options={{
                  chart: { type: "bar" as const, toolbar: { show: false } },
                  colors: ["#615FD3"],
                  xaxis: {
                    categories: avgBookingsGraph.map((d) => d.time) || [],
                  },
                  plotOptions: { bar: { borderRadius: 4 } },
                  dataLabels: { enabled: false }, // 🔥 turn off labels on bars
                  tooltip: {
                    y: {
                      formatter: (val: number) =>
                        `${Number(val).toFixed(2)} bookings`,
                    },
                    custom: ({ series, dataPointIndex, w }) => {
                      const label =
                        w?.globals?.categoryLabels?.[dataPointIndex] ??
                        w?.globals?.labels?.[dataPointIndex] ??
                        "";
                      const value = series?.[0]?.[dataPointIndex] ?? 0;
                      return `
                        <div style="padding:10px 12px; max-width: 320px; white-space: normal;">
                          <div style="font-weight:600; margin-bottom:6px;">${label}</div>
                          <div style="font-size:12px; margin-bottom:6px;">
                            Average bookings per instructor: <b>${Number(value).toFixed(2)}</b>
                          </div>
                          <div style="font-size:11px; color:#6b7280;">
                            Displays the average number of bookings received per instructor during the selected time frame.
                          </div>
                        </div>
                      `;
                    },
                  },
                }}
                series={[
                  {
                    name: "Bookings",
                    data:
                      avgBookingsGraph.map((d) =>
                        Math.round(d.averageBookings),
                      ) || [],
                  },
                ]}
                type="bar"
                height={300}
              />
            )}
          </CardContent>
        </Card>

        {/* Total Earnings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Total Earning
              <div className="flex items-center gap-2">
                <select
                  value={totalEarningsViewMode}
                  onChange={(e) => {
                    const nextMode = e.target.value as
                      | "monthly"
                      | "yearly_monthwise";
                    setTotalEarningsViewMode(nextMode);
                    setIsTotalEarningsLoading(true);
                    void (async () => {
                      try {
                        if (nextMode === "yearly_monthwise") {
                          const series = await fetchTotalEarningsYearMonthwise(
                            totalEarningsYear,
                          );
                          setTotalEarningsGraph(series as typeof totalEarningsGraph);
                        } else {
                          const gd = await fetchGraphDataForMonthYear(
                            totalEarningsMonth,
                            totalEarningsYear,
                          );
                          setTotalEarningsGraph(gd?.totalEarnings ?? []);
                        }
                      } finally {
                        setIsTotalEarningsLoading(false);
                      }
                    })();
                  }}
                  className="h-9 text-sm border border-gray-200 rounded-lg px-3 bg-white shadow-sm hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5FC2D3]/60 focus:border-[#5FC2D3] transition-colors"
                  aria-label="Select total earnings view"
                >
                  <option value="monthly">Monthly (days wise)</option>
                  <option value="yearly_monthwise">Yearly (month-wise)</option>
                </select>
                <PeriodDropdowns
                  month={totalEarningsMonth}
                  year={totalEarningsYear}
                  setMonth={setTotalEarningsMonth}
                  setYear={setTotalEarningsYear}
                  disableMonth={totalEarningsViewMode === "yearly_monthwise"}
                  onChange={async (m, y) => {
                    setIsTotalEarningsLoading(true);
                    try {
                      if (totalEarningsViewMode === "yearly_monthwise") {
                        const series = await fetchTotalEarningsYearMonthwise(y);
                        setTotalEarningsGraph(series as typeof totalEarningsGraph);
                      } else {
                        const gd = await fetchGraphDataForMonthYear(m, y);
                        setTotalEarningsGraph(gd?.totalEarnings ?? []);
                      }
                    } finally {
                      setIsTotalEarningsLoading(false);
                    }
                  }}
                />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-visible">
            {isTotalEarningsLoading ? (
              <GraphLoader height={250} />
            ) : (
              <>
                <div className="mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">
                        CHF{" "}
                        {totalEarningsGraph
                          .reduce((sum, d) => sum + (d.totalEarnings ?? 0), 0)
                          .toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-500">
                        Selected period
                      </div>
                    </div>
                  </div>
                </div>
                <Chart
                  options={{
                    chart: { type: "bar" as const, toolbar: { show: false } },
                    colors: ["#5FC2D3"],
                    xaxis: {
                      categories: totalEarningsGraph.map((d) => d.time) || [],
                    },
                    plotOptions: { bar: { borderRadius: 4 } },
                    dataLabels: { enabled: false }, // 🔥 turn off labels on bars
                    tooltip: {
                      y: {
                        formatter: (val: number) =>
                          `CHF ${Number(val).toFixed(2)}`,
                      },
                      custom: ({ series, dataPointIndex, w }) => {
                        const label =
                          w?.globals?.categoryLabels?.[dataPointIndex] ??
                          w?.globals?.labels?.[dataPointIndex] ??
                          "";
                        const value = series?.[0]?.[dataPointIndex] ?? 0;
                        return `
                          <div style="padding:10px 12px; max-width: 320px; white-space: normal;">
                            <div style="font-weight:600; margin-bottom:6px;">${label}</div>
                            <div style="font-size:12px; margin-bottom:6px;">
                              Total earnings (after commission): <b>CHF ${Number(value).toFixed(2)}</b>
                            </div>
                            <div style="font-size:11px; color:#6b7280;">
                              Shows the total money earned by instructors (after DSP commission) from delivered paid lessons during the selected time frame.
                            </div>
                          </div>
                        `;
                      },
                    },
                  }}
                  series={[
                    {
                      name: "Total Earnings",
                      data:
                        totalEarningsGraph.map((d) =>
                          Math.round(d.totalEarnings),
                        ) || [],
                    },
                  ]}
                  type="bar"
                  height={250}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Conversion Rates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
          Traffic Dashboard
            <div className="flex gap-2 text-sm">
              <span className="text-gray-500">Last Week</span>
              <span className="text-gray-500">Last Month</span>
              <span className="text-gray-500">Last Year</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Chart
            options={{
              chart: {
                type: "bar" as const,
                stacked: false, // Not stacked since we want separate bars
                toolbar: { show: false },
              },
              plotOptions: {
                bar: {
                  horizontal: true,
                  columnWidth: "60%",
                  dataLabels: {
                    position: "center",
                  },
                },
              },
              colors: ["#E879F9", "#FB923C"], // Pink for visitors, Orange for registrations (matching your image colors)
              xaxis: {
                categories: ["Visitors", "Registrations"], // Two categories
                title: {
                  text: "Users",
                },
              },
              yaxis: {
                title: {
                  text: "User Type",
                },
              },
              dataLabels: {
                enabled: true,
                style: {
                  colors: ["#fff"],
                  fontSize: "12px",
                  fontWeight: "bold",
                },
                formatter: (val) => val.toString(),
                offsetX: 0,
                textAnchor: "middle",
              },
              legend: {
                show: false, // Hide legend since category names are on y-axis
              },
              tooltip: {
                shared: false,
                intersect: true,
                y: {
                  formatter: (val) => `${val} users`,
                },
              },
            }}
            series={[
              {
                name: "Count",
                data: [totalVisitors, totalRegistrations],
              },
            ]}
            type="bar"
            height={350}
          />
        </CardContent>
      </Card>
    </div>
  );
}
