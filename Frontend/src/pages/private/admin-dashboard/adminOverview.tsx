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
import Chart from "../../../components/performance/LazyApexChart";
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
  const ALL_MONTHS = "all_months";
  const ALL_YEARS = "all_years";
  const [filters, setFilters] = useState<AnalyticsFilterInput>({
    filterType: FilterType.THIS_MONTH,
  });

  const [selectedInstructors, setSelectedInstructors] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);
  const now = useMemo(() => new Date(), []);
  const defaultGraphMonth = useMemo(() => String(now.getMonth()), [now]);
  const defaultGraphYear = useMemo(() => String(now.getFullYear()), [now]);
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
  const stats = analyticsData?.getAdminAnalytics.overallStats;
  const graphData = analyticsData?.getAdminAnalytics.graphData;

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
    [apolloClient],
  );
  const fetchGraphDataForDateRange = useCallback(
    async (from: Date, to: Date) => {
      const filter: AnalyticsFilterInput = {
        filterType: FilterType.CUSTOM,
        fromDate: format(from, "yyyy-MM-dd"),
        toDate: format(to, "yyyy-MM-dd"),
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
    [apolloClient],
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

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 8 }, (_, i) =>
      String(currentYear - i),
    );
  }, []);

  const PeriodDropdowns = ({
    month,
    year,
    setMonth,
    setYear,
    onChange,
  }: {
    month: string;
    year: string;
    setMonth: (v: string) => void;
    setYear: (v: string) => void;
    onChange: (m: string, y: string) => void;
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
    const years = availableYears;

    return (
      <div className="flex items-center gap-2">
        <select
          value={month}
          onChange={(e) => {
            const next = e.target.value;
            setMonth(next);
            onChange(next, year);
          }}
          className="h-9 text-sm border border-gray-200 rounded-lg px-3 bg-white shadow-sm hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5FC2D3]/60 focus:border-[#5FC2D3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Select month"
        >
          <option value={ALL_MONTHS}>All Months</option>
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
          <option value={ALL_YEARS}>All Years</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
    );
  };
  const getAggregationLabel = useCallback(
    (monthValue: string, yearValue: string) => {
      if (monthValue !== ALL_MONTHS && yearValue !== ALL_YEARS) return "Daily";
      if (monthValue === ALL_MONTHS && yearValue !== ALL_YEARS) return "Monthly";
      return "Yearly";
    },
    [ALL_MONTHS, ALL_YEARS],
  );
  const getAverageUnitLabel = useCallback(
    (monthValue: string, yearValue: string) => {
      const aggregation = getAggregationLabel(monthValue, yearValue);
      if (aggregation === "Daily") return "day";
      if (aggregation === "Monthly") return "month";
      return "year";
    },
    [getAggregationLabel],
  );

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
  const [trafficGraph, setTrafficGraph] = useState(graphData?.conversionRates ?? []);

  const [activeUsersMonth, setActiveUsersMonth] = useState(
    String(now.getMonth()),
  );
  const [activeUsersYear, setActiveUsersYear] = useState(String(now.getFullYear()));
  const [avgRevenueMonth, setAvgRevenueMonth] = useState(String(now.getMonth()));
  const [avgRevenueYear, setAvgRevenueYear] = useState(String(now.getFullYear()));
  const [avgBookingsMonth, setAvgBookingsMonth] = useState(String(now.getMonth()));
  const [avgBookingsYear, setAvgBookingsYear] = useState(String(now.getFullYear()));
  const [totalEarningsMonth, setTotalEarningsMonth] = useState(String(now.getMonth()));
  const [totalEarningsYear, setTotalEarningsYear] = useState(String(now.getFullYear()));
  const [trafficMonth, setTrafficMonth] = useState(String(now.getMonth()));
  const [trafficYear, setTrafficYear] = useState(String(now.getFullYear()));

  const [isActiveUsersLoading, setIsActiveUsersLoading] = useState(false);
  const [isAvgRevenueLoading, setIsAvgRevenueLoading] = useState(false);
  const [isAvgBookingsLoading, setIsAvgBookingsLoading] = useState(false);
  const [isTotalEarningsLoading, setIsTotalEarningsLoading] = useState(false);
  const [isTrafficLoading, setIsTrafficLoading] = useState(false);

  const aggregateActiveUsersPoint = useCallback(
    (points: { students: number; instructors: number }[]) => ({
      students:
        points.length > 0
          ? Number(
              (
                points.reduce((sum, p) => sum + Number(p.students || 0), 0) /
                points.length
              ).toFixed(2),
            )
          : 0,
      instructors:
        points.length > 0
          ? Number(
              (
                points.reduce((sum, p) => sum + Number(p.instructors || 0), 0) /
                points.length
              ).toFixed(2),
            )
          : 0,
    }),
    [],
  );
  const aggregateRevenuePoint = useCallback(
    (points: { averageRevenue: number }[]) =>
      points.length > 0
        ? Number(
            (
              points.reduce((sum, p) => sum + Number(p.averageRevenue || 0), 0) /
              points.length
            ).toFixed(2),
          )
        : 0,
    [],
  );
  const aggregateBookingsPoint = useCallback(
    (points: { averageBookings: number }[]) =>
      points.length > 0
        ? Number(
            (
              points.reduce((sum, p) => sum + Number(p.averageBookings || 0), 0) /
              points.length
            ).toFixed(2),
          )
        : 0,
    [],
  );
  const aggregateEarningsPoint = useCallback(
    (points: { totalEarnings: number }[]) =>
      Number(
        points
          .reduce((sum, p) => sum + Number(p.totalEarnings || 0), 0)
          .toFixed(2),
      ),
    [],
  );
  const aggregateConversionPoint = useCallback(
    (points: { visitors: number; registrations: number }[]) => {
      const visitors = points.reduce((sum, p) => sum + Number(p.visitors || 0), 0);
      const registrations = points.reduce(
        (sum, p) => sum + Number(p.registrations || 0),
        0,
      );
      const rate = visitors > 0 ? Number(((registrations / visitors) * 100).toFixed(2)) : 0;
      return { visitors, registrations, rate };
    },
    [],
  );

  const fetchGraphsForPeriod = useCallback(
    async (monthValue: string, yearValue: string) => {
      const yearsToUse =
        yearValue === ALL_YEARS ? availableYears : [yearValue];
      if (yearsToUse.length === 0) {
        return {
          activeUsers: [],
          averageRevenuePerInstructor: [],
          bookingsPerInstructor: [],
          totalEarnings: [],
          conversionRates: [],
        };
      }

      if (monthValue !== ALL_MONTHS && yearValue !== ALL_YEARS) {
        const gd = await fetchGraphDataForMonthYear(monthValue, yearValue);
        return {
          activeUsers: gd?.activeUsers ?? [],
          averageRevenuePerInstructor: gd?.averageRevenuePerInstructor ?? [],
          bookingsPerInstructor: gd?.bookingsPerInstructor ?? [],
          totalEarnings: gd?.totalEarnings ?? [],
          conversionRates: gd?.conversionRates ?? [],
        };
      }

      if (monthValue === ALL_MONTHS && yearValue !== ALL_YEARS) {
        const byMonth = await Promise.all(
          Array.from({ length: 12 }, async (_, monthIdx) => {
            const gd = await fetchGraphDataForMonthYear(String(monthIdx), yearValue);
            const activeAgg = aggregateActiveUsersPoint(gd?.activeUsers ?? []);
            const conversionAgg = aggregateConversionPoint(gd?.conversionRates ?? []);
            return {
              time: monthShortLabels[monthIdx],
              active: activeAgg,
              revenue: aggregateRevenuePoint(gd?.averageRevenuePerInstructor ?? []),
              bookings: aggregateBookingsPoint(gd?.bookingsPerInstructor ?? []),
              earnings: aggregateEarningsPoint(gd?.totalEarnings ?? []),
              conversion: conversionAgg,
            };
          }),
        );
        return {
          activeUsers: byMonth.map((p) => ({ time: p.time, ...p.active })),
          averageRevenuePerInstructor: byMonth.map((p) => ({
            time: p.time,
            averageRevenue: p.revenue,
          })),
          bookingsPerInstructor: byMonth.map((p) => ({
            time: p.time,
            averageBookings: p.bookings,
          })),
          totalEarnings: byMonth.map((p) => ({
            time: p.time,
            totalEarnings: p.earnings,
          })),
          conversionRates: byMonth.map((p) => ({
            time: p.time,
            visitors: p.conversion.visitors,
            registrations: p.conversion.registrations,
            rate: p.conversion.rate,
          })),
        };
      }

      if (monthValue !== ALL_MONTHS && yearValue === ALL_YEARS) {
        const byYear = await Promise.all(
          yearsToUse.map(async (y) => {
            const gd = await fetchGraphDataForMonthYear(monthValue, y);
            const activeAgg = aggregateActiveUsersPoint(gd?.activeUsers ?? []);
            return {
              time: y,
              active: activeAgg,
              revenue: aggregateRevenuePoint(gd?.averageRevenuePerInstructor ?? []),
              bookings: aggregateBookingsPoint(gd?.bookingsPerInstructor ?? []),
              earnings: aggregateEarningsPoint(gd?.totalEarnings ?? []),
              conversion: aggregateConversionPoint(gd?.conversionRates ?? []),
            };
          }),
        );
        const sorted = byYear.sort((a, b) => Number(a.time) - Number(b.time));
        return {
          activeUsers: sorted.map((p) => ({ time: p.time, ...p.active })),
          averageRevenuePerInstructor: sorted.map((p) => ({
            time: p.time,
            averageRevenue: p.revenue,
          })),
          bookingsPerInstructor: sorted.map((p) => ({
            time: p.time,
            averageBookings: p.bookings,
          })),
          totalEarnings: sorted.map((p) => ({
            time: p.time,
            totalEarnings: p.earnings,
          })),
          conversionRates: sorted.map((p) => ({
            time: p.time,
            visitors: p.conversion.visitors,
            registrations: p.conversion.registrations,
            rate: p.conversion.rate,
          })),
        };
      }

      const byYearAllMonths = await Promise.all(
        yearsToUse.map(async (y) => {
          const from = new Date(Number(y), 0, 1);
          const to = new Date(Number(y), 11, 31);
          const gd = await fetchGraphDataForDateRange(from, to);
          const activeAgg = aggregateActiveUsersPoint(gd?.activeUsers ?? []);
          return {
            time: y,
            active: activeAgg,
            revenue: aggregateRevenuePoint(gd?.averageRevenuePerInstructor ?? []),
            bookings: aggregateBookingsPoint(gd?.bookingsPerInstructor ?? []),
            earnings: aggregateEarningsPoint(gd?.totalEarnings ?? []),
            conversion: aggregateConversionPoint(gd?.conversionRates ?? []),
          };
        }),
      );
      const sorted = byYearAllMonths.sort((a, b) => Number(a.time) - Number(b.time));
      return {
        activeUsers: sorted.map((p) => ({ time: p.time, ...p.active })),
        averageRevenuePerInstructor: sorted.map((p) => ({
          time: p.time,
          averageRevenue: p.revenue,
        })),
        bookingsPerInstructor: sorted.map((p) => ({
          time: p.time,
          averageBookings: p.bookings,
        })),
        totalEarnings: sorted.map((p) => ({
          time: p.time,
          totalEarnings: p.earnings,
        })),
        conversionRates: sorted.map((p) => ({
          time: p.time,
          visitors: p.conversion.visitors,
          registrations: p.conversion.registrations,
          rate: p.conversion.rate,
        })),
      };
    },
    [
      ALL_MONTHS,
      ALL_YEARS,
      aggregateActiveUsersPoint,
      aggregateBookingsPoint,
      aggregateConversionPoint,
      aggregateEarningsPoint,
      aggregateRevenuePoint,
      availableYears,
      fetchGraphDataForDateRange,
      fetchGraphDataForMonthYear,
      monthShortLabels,
    ],
  );

  React.useEffect(() => {
    setIsActiveUsersLoading(true);
    setIsAvgRevenueLoading(true);
    setIsAvgBookingsLoading(true);
    setIsTotalEarningsLoading(true);
    setIsTrafficLoading(true);
    void fetchGraphsForPeriod(activeUsersMonth, activeUsersYear)
      .then((gd) => {
        setActiveUsersGraph(gd.activeUsers ?? []);
        setAvgRevenueGraph(gd.averageRevenuePerInstructor ?? []);
        setAvgBookingsGraph(gd.bookingsPerInstructor ?? []);
        setTotalEarningsGraph(gd.totalEarnings ?? []);
        setTrafficGraph(gd.conversionRates ?? []);
      })
      .finally(() => {
        setIsActiveUsersLoading(false);
        setIsAvgRevenueLoading(false);
        setIsAvgBookingsLoading(false);
        setIsTotalEarningsLoading(false);
        setIsTrafficLoading(false);
      });
    // Intentionally run once: chart filters are independent from global top-right filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const activeUsersKpi = useMemo(() => {
    const students =
      activeUsersGraph.length > 0
        ? activeUsersGraph.reduce((sum, d) => sum + Number(d.students || 0), 0) /
          activeUsersGraph.length
        : 0;
    const instructors =
      activeUsersGraph.length > 0
        ? activeUsersGraph.reduce((sum, d) => sum + Number(d.instructors || 0), 0) /
          activeUsersGraph.length
        : 0;
    return {
      students: Number(students.toFixed(2)),
      instructors: Number(instructors.toFixed(2)),
    };
  }, [activeUsersGraph]);
  const avgRevenueKpi = useMemo(
    () =>
      avgRevenueGraph.length > 0
        ? Number(
            (
              avgRevenueGraph.reduce((sum, d) => sum + Number(d.averageRevenue || 0), 0) /
              avgRevenueGraph.length
            ).toFixed(2),
          )
        : 0,
    [avgRevenueGraph],
  );
  const avgBookingsKpi = useMemo(
    () =>
      avgBookingsGraph.length > 0
        ? Number(
            (
              avgBookingsGraph.reduce((sum, d) => sum + Number(d.averageBookings || 0), 0) /
              avgBookingsGraph.length
            ).toFixed(2),
          )
        : 0,
    [avgBookingsGraph],
  );

  // Calculate collective totals from the conversion rates data
  const totalVisitors =
    trafficGraph.reduce((sum, d) => sum + Number(d.visitors || 0), 0) || 0;
  const totalRegistrations =
    trafficGraph.reduce((sum, d) => sum + Number(d.registrations || 0), 0) ||
    0;

  const GraphLoader = ({ height = 300 }: { height?: number }) => (
    <div
      className="w-full flex items-center justify-center"
      style={{ height }}
      aria-label="Loading chart"
    >
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#5FC2D3]" />
    </div>
  );

  const StatsCardLoader = () => (
    <Card className="border border-gray-200">
      <CardContent className="p-6">
        <div className="animate-pulse">
          <div className="h-4 w-32 rounded bg-gray-200 mb-3" />
          <div className="h-8 w-20 rounded bg-gray-300 mb-4" />
          <div className="h-3 w-40 rounded bg-gray-200 mb-2" />
          <div className="h-3 w-36 rounded bg-gray-200" />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 bg-slate-50 min-h-screen">
      {/* Filter Section */}
      <div className="flex flex-wrap items-center justify-between gap-4">
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
        {analyticsLoading ? (
          <>
            <StatsCardLoader />
            <StatsCardLoader />
            <StatsCardLoader />
            <StatsCardLoader />
            <StatsCardLoader />
          </>
        ) : (
          <>
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
          subtitle="Average number of lesson hours each student reserved "
          tooltip="Total hours of all booked lessons divided by the number of students who booked lessons, within the selected period."
        />
          </>
        )}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Users Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Active Users
              <div className="flex items-center gap-2">
                <PeriodDropdowns
                  month={activeUsersMonth}
                  year={activeUsersYear}
                  setMonth={setActiveUsersMonth}
                  setYear={setActiveUsersYear}
                  onChange={async (m, y) => {
                    setIsActiveUsersLoading(true);
                    try {
                      const gd = await fetchGraphsForPeriod(m, y);
                      setActiveUsersGraph(gd.activeUsers ?? []);
                    } finally {
                      setIsActiveUsersLoading(false);
                    }
                  }}
                />
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  Aggregation: {getAggregationLabel(activeUsersMonth, activeUsersYear)}
                </span>
                <button
                  type="button"
                  className="text-xs text-[#2563eb] hover:underline whitespace-nowrap"
                  onClick={async () => {
                    setActiveUsersMonth(defaultGraphMonth);
                    setActiveUsersYear(defaultGraphYear);
                    setIsActiveUsersLoading(true);
                    try {
                      const gd = await fetchGraphsForPeriod(
                        defaultGraphMonth,
                        defaultGraphYear,
                      );
                      setActiveUsersGraph(gd.activeUsers ?? []);
                    } finally {
                      setIsActiveUsersLoading(false);
                    }
                  }}
                >
                  Clear filter
                </button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-visible">
            {isActiveUsersLoading ? (
              <GraphLoader height={300} />
            ) : (
              <>
              <div className="mb-4 flex items-center gap-6">
                <div>
                  <div className="text-xs text-gray-500">
                    {`Students (avg/${getAverageUnitLabel(activeUsersMonth, activeUsersYear)})`}
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{activeUsersKpi.students}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">
                    {`Instructors (avg/${getAverageUnitLabel(activeUsersMonth, activeUsersYear)})`}
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{activeUsersKpi.instructors}</div>
                </div>
              </div>
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
              </>
            )}
          </CardContent>
        </Card>

        {/* Average Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Average Revenue per Instructor
              <div className="flex items-center gap-2">
                <PeriodDropdowns
                  month={avgRevenueMonth}
                  year={avgRevenueYear}
                  setMonth={setAvgRevenueMonth}
                  setYear={setAvgRevenueYear}
                  onChange={async (m, y) => {
                    setIsAvgRevenueLoading(true);
                    try {
                      const gd = await fetchGraphsForPeriod(m, y);
                      setAvgRevenueGraph(gd.averageRevenuePerInstructor ?? []);
                    } finally {
                      setIsAvgRevenueLoading(false);
                    }
                  }}
                />
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  Aggregation: {getAggregationLabel(avgRevenueMonth, avgRevenueYear)}
                </span>
                <button
                  type="button"
                  className="text-xs text-[#2563eb] hover:underline whitespace-nowrap"
                  onClick={async () => {
                    setAvgRevenueMonth(defaultGraphMonth);
                    setAvgRevenueYear(defaultGraphYear);
                    setIsAvgRevenueLoading(true);
                    try {
                      const gd = await fetchGraphsForPeriod(
                        defaultGraphMonth,
                        defaultGraphYear,
                      );
                      setAvgRevenueGraph(gd.averageRevenuePerInstructor ?? []);
                    } finally {
                      setIsAvgRevenueLoading(false);
                    }
                  }}
                >
                  Clear filter
                </button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-visible">
            {isAvgRevenueLoading ? (
              <GraphLoader height={300} />
            ) : (
              <>
              <div className="mb-4">
                <div
                  className="text-xs text-gray-500"
                  title="Computed as the simple mean of chart points for the selected aggregation; low-activity periods are included."
                >
                  {`Average per ${getAverageUnitLabel(avgRevenueMonth, avgRevenueYear)} in selected period`}
                </div>
                <div className="text-2xl font-bold text-gray-900">CHF {avgRevenueKpi.toFixed(2)}</div>
              </div>
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
              </>
            )}
          </CardContent>
        </Card>

        {/* Average Bookings per Instructor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Average Bookings per Instructor
              <div className="flex items-center gap-2">
                <PeriodDropdowns
                  month={avgBookingsMonth}
                  year={avgBookingsYear}
                  setMonth={setAvgBookingsMonth}
                  setYear={setAvgBookingsYear}
                  onChange={async (m, y) => {
                    setIsAvgBookingsLoading(true);
                    try {
                      const gd = await fetchGraphsForPeriod(m, y);
                      setAvgBookingsGraph(gd.bookingsPerInstructor ?? []);
                    } finally {
                      setIsAvgBookingsLoading(false);
                    }
                  }}
                />
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  Aggregation: {getAggregationLabel(avgBookingsMonth, avgBookingsYear)}
                </span>
                <button
                  type="button"
                  className="text-xs text-[#2563eb] hover:underline whitespace-nowrap"
                  onClick={async () => {
                    setAvgBookingsMonth(defaultGraphMonth);
                    setAvgBookingsYear(defaultGraphYear);
                    setIsAvgBookingsLoading(true);
                    try {
                      const gd = await fetchGraphsForPeriod(
                        defaultGraphMonth,
                        defaultGraphYear,
                      );
                      setAvgBookingsGraph(gd.bookingsPerInstructor ?? []);
                    } finally {
                      setIsAvgBookingsLoading(false);
                    }
                  }}
                >
                  Clear filter
                </button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-visible">
            {isAvgBookingsLoading ? (
              <GraphLoader height={300} />
            ) : (
              <>
              <div className="mb-4">
                <div
                  className="text-xs text-gray-500"
                  title="Computed as the simple mean of chart points for the selected aggregation; low-activity periods are included."
                >
                  {`Average per ${getAverageUnitLabel(avgBookingsMonth, avgBookingsYear)} in selected period`}
                </div>
                <div className="text-2xl font-bold text-gray-900">{avgBookingsKpi.toFixed(2)}</div>
              </div>
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
                        Number(Number(d.averageBookings || 0).toFixed(2)),
                      ) || [],
                  },
                ]}
                type="bar"
                height={300}
              />
              </>
            )}
          </CardContent>
        </Card>

        {/* Total Earnings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Total Earning
              <div className="flex items-center gap-2">
                <PeriodDropdowns
                  month={totalEarningsMonth}
                  year={totalEarningsYear}
                  setMonth={setTotalEarningsMonth}
                  setYear={setTotalEarningsYear}
                  onChange={async (m, y) => {
                    setIsTotalEarningsLoading(true);
                    try {
                      const gd = await fetchGraphsForPeriod(m, y);
                      setTotalEarningsGraph(gd.totalEarnings ?? []);
                    } finally {
                      setIsTotalEarningsLoading(false);
                    }
                  }}
                />
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  Aggregation: {getAggregationLabel(totalEarningsMonth, totalEarningsYear)}
                </span>
                <button
                  type="button"
                  className="text-xs text-[#2563eb] hover:underline whitespace-nowrap"
                  onClick={async () => {
                    setTotalEarningsMonth(defaultGraphMonth);
                    setTotalEarningsYear(defaultGraphYear);
                    setIsTotalEarningsLoading(true);
                    try {
                      const gd = await fetchGraphsForPeriod(
                        defaultGraphMonth,
                        defaultGraphYear,
                      );
                      setTotalEarningsGraph(gd.totalEarnings ?? []);
                    } finally {
                      setIsTotalEarningsLoading(false);
                    }
                  }}
                >
                  Clear filter
                </button>
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
            <div className="flex items-center gap-2">
              <PeriodDropdowns
                month={trafficMonth}
                year={trafficYear}
                setMonth={setTrafficMonth}
                setYear={setTrafficYear}
                onChange={async (m, y) => {
                  setIsTrafficLoading(true);
                  try {
                    const gd = await fetchGraphsForPeriod(m, y);
                    setTrafficGraph(gd.conversionRates ?? []);
                  } finally {
                    setIsTrafficLoading(false);
                  }
                }}
              />
              <span className="text-xs text-gray-500 whitespace-nowrap">
                Aggregation: {getAggregationLabel(trafficMonth, trafficYear)}
              </span>
              <button
                type="button"
                className="text-xs text-[#2563eb] hover:underline whitespace-nowrap"
                onClick={async () => {
                  setTrafficMonth(defaultGraphMonth);
                  setTrafficYear(defaultGraphYear);
                  setIsTrafficLoading(true);
                  try {
                    const gd = await fetchGraphsForPeriod(
                      defaultGraphMonth,
                      defaultGraphYear,
                    );
                    setTrafficGraph(gd.conversionRates ?? []);
                  } finally {
                    setIsTrafficLoading(false);
                  }
                }}
              >
                Clear filter
              </button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isTrafficLoading ? (
            <GraphLoader height={350} />
          ) : (
            <>
          <div className="mb-4 flex items-center gap-6">
            <div>
              <div className="text-xs text-gray-500">Visitors</div>
              <div className="text-2xl font-bold text-gray-900">{totalVisitors}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Registrations</div>
              <div className="text-2xl font-bold text-gray-900">{totalRegistrations}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Conversion rate</div>
              <div className="text-2xl font-bold text-gray-900">
                {totalVisitors > 0
                  ? `${((totalRegistrations / totalVisitors) * 100).toFixed(1)}%`
                  : "0.0%"}
              </div>
            </div>
          </div>
          <Chart
            options={{
              chart: {
                type: "line" as const,
                toolbar: { show: false },
              },
              colors: ["#E879F9", "#FB923C"],
              xaxis: {
                categories: trafficGraph.map((d) => d.time),
              },
              stroke: { curve: "smooth" as const, width: 3 },
              yaxis: [{ title: { text: "Users" } }],
              dataLabels: {
                enabled: false,
              },
              legend: {
                show: true,
              },
              tooltip: {
                shared: true,
                intersect: false,
                y: {
                  formatter: (val) => `${val} users`,
                },
              },
            }}
            series={[
              {
                name: "Visitors",
                data: trafficGraph.map((d) => Math.round(Number(d.visitors || 0))),
              },
              {
                name: "Registrations",
                data: trafficGraph.map((d) =>
                  Math.round(Number(d.registrations || 0)),
                ),
              },
            ]}
            type="line"
            height={350}
          />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
