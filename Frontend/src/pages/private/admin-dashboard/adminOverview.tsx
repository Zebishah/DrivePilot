"use client";

import React, { useCallback } from "react";

import type { ReactNode } from "react";
import { useState } from "react";
import { useQuery } from "@apollo/client/react";
import {
  CalendarIcon,
  FilterIcon,
  Users,
  BookOpen,
  Star,
  TrendingUp,
  X,
  ChevronDown,
} from "lucide-react";
import { format } from "date-fns";
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
// Dynamically import ApexCharts to avoid SSR issues
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

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
                }
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
}

function StatCard({
  title,
  value,
  icon,
  color,
  isPercentage = false,
}: StatCardProps) {
  return (
    <Card className={`${color} border-0`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white/80">{title}</p>
            <p className="text-3xl font-bold text-white">
              {isPercentage ? `${value.toFixed(1)}%` : value}
            </p>
          </div>
          <div className="text-white/80">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AnalyticsDashboard() {
  const [filters, setFilters] = useState<AnalyticsFilterInput>({
    filterType: FilterType.LAST_MONTH,
  });

  const [selectedInstructors, setSelectedInstructors] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);

  const {
    data: analyticsData,
    loading: analyticsLoading,
    refetch,
  } = useQuery<{ getAdminAnalytics: AdminAnalytics }>(GET_ADMIN_ANALYTICS, {
    variables: { filter: filters },
    fetchPolicy: "cache-first", // Changed from "cache-and-network"
    notifyOnNetworkStatusChange: false,
  });

  const { data: instructorsData, loading: instructorsLoading } = useQuery<{
    getAllInstructors: Instructor[];
  }>(GET_ALL_INSTRUCTORS);

  const instructors = instructorsData?.getAllInstructors || [];

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

    setFilters(newFilters);
    setIsFilterOpen(false);
  }, [filters.filterType, selectedInstructors, dateRange.from, dateRange.to]);

  const clearFilters = () => {
    setFilters({ filterType: FilterType.LAST_MONTH });
    setSelectedInstructors([]);
    setDateRange({});
    refetch();
  };

  const toggleInstructor = (instructorId: string) => {
    setSelectedInstructors((prev) =>
      prev.includes(instructorId)
        ? prev.filter((id) => id !== instructorId)
        : [...prev, instructorId]
    );
  };

  const stats = analyticsData?.getAdminAnalytics.overallStats;
  const graphData = analyticsData?.getAdminAnalytics.graphData;

  // Calculate collective totals from the conversion rates data
  const totalVisitors =
    graphData?.conversionRates.reduce((sum, d) => sum + d.visitors, 0) || 0;
  console.log("grpahdata.conversation", graphData?.conversionRates);
  const totalRegistrations =
    graphData?.conversionRates.reduce((sum, d) => sum + d.registrations, 0) ||
    0;
  console.log("total", totalRegistrations);

  if (analyticsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

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
                                instructor._id
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Registrations"
          value={stats?.totalRegistrations || 0}
          icon={<Users className="h-8 w-8" />}
          color="bg-gradient-to-r from-pink-400 to-pink-500"
        />
        <StatCard
          title="Lessons Booked"
          value={stats?.totalLessonsBooked || 0}
          icon={<BookOpen className="h-8 w-8" />}
          color="bg-gradient-to-r from-yellow-400 to-yellow-500"
        />
        <StatCard
          title="Reviews Given"
          value={stats?.reviewsGiven || 0}
          icon={<Star className="h-8 w-8" />}
          color="bg-gradient-to-r from-purple-400 to-purple-500"
        />
        <StatCard
          title="Lessons Attendance"
          value={stats?.attendanceRate || 0}
          icon={<TrendingUp className="h-8 w-8" />}
          color="bg-gradient-to-r from-blue-400 to-blue-500"
          isPercentage
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Users Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Active Users
              <div className="flex gap-2 text-sm">
                <span className="text-gray-500">Last Month</span>
                <span className="text-gray-500">Last 6 Month</span>
                <span className="text-gray-500">Last Year</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Chart
              options={{
                chart: { type: "line" as const, toolbar: { show: false } },
                colors: ["#008FFBD9", "#FFDB20"],
                stroke: { curve: "smooth" as const, width: 3 },
                xaxis: {
                  categories: graphData?.activeUsers.map((d) => d.time) || [],
                },
                legend: { position: "top" as const },
                grid: { strokeDashArray: 3 },
              }}
              series={[
                {
                  name: "Students(Active)",
                  data:
                    graphData?.activeUsers.map((d) => Math.round(d.students)) ||
                    [],
                },
                {
                  name: "Instructor(Active)",
                  data:
                    graphData?.activeUsers.map((d) =>
                      Math.round(d.instructors)
                    ) || [],
                },
              ]}
              type="line"
              height={300}
            />
          </CardContent>
        </Card>

        {/* Average Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Average Revenue per Instructor</CardTitle>
          </CardHeader>
          <CardContent>
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
                  categories:
                    graphData?.averageRevenuePerInstructor.map((d) => d.time) ||
                    [],
                },
                plotOptions: { bar: { borderRadius: 4 } },
                dataLabels: { enabled: false }, // 🔥 turn off labels on bars
              }}
              series={[
                {
                  name: "Revenue per Instructor",
                  data:
                    graphData?.averageRevenuePerInstructor.map((d) =>
                      Math.round(d.averageRevenue)
                    ) || [],
                },
              ]}
              type="bar"
              height={300}
            />
          </CardContent>
        </Card>

        {/* Bookings Per Instructor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Bookings Per Instructor
              <Button variant="ghost" size="sm">
                <FilterIcon className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Chart
              options={{
                chart: { type: "bar" as const, toolbar: { show: false } },
                colors: ["#615FD3"],
                xaxis: {
                  categories:
                    graphData?.bookingsPerInstructor.map((d) => d.time) || [],
                },
                plotOptions: { bar: { borderRadius: 4 } },
                dataLabels: { enabled: false }, // 🔥 turn off labels on bars
              }}
              series={[
                {
                  name: "Bookings",
                  data:
                    graphData?.bookingsPerInstructor.map((d) =>
                      Math.round(d.averageBookings)
                    ) || [],
                },
              ]}
              type="bar"
              height={300}
            />
          </CardContent>
        </Card>

        {/* Total Earnings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Total Earning
              <div className="flex gap-2 text-sm">
                <span className="text-blue-600 font-medium">Last Week</span>
                <span className="text-gray-500">Last Month</span>
                <span className="text-gray-500">Last Year</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    $
                    {stats?.totalRegistrations
                      ? (stats.totalRegistrations * 27.3).toFixed(1)
                      : "0.0"}
                  </div>
                  <div className="text-sm text-gray-500">Last Week</div>
                </div>
                <div className="text-green-600 text-sm font-medium">
                  ↗ 163%
                </div>
              </div>
            </div>
            <Chart
              options={{
                chart: { type: "bar" as const, toolbar: { show: false } },
                colors: ["#5FC2D3"],
                xaxis: {
                  categories: graphData?.totalEarnings.map((d) => d.time) || [],
                },
                plotOptions: { bar: { borderRadius: 4 } },
                dataLabels: { enabled: false }, // 🔥 turn off labels on bars
              }}
              series={[
                {
                  name: "Total Earnings",
                  data:
                    graphData?.totalEarnings.map((d) =>
                      Math.round(d.totalEarnings)
                    ) || [],
                },
              ]}
              type="bar"
              height={250}
            />
          </CardContent>
        </Card>
      </div>

      {/* Conversion Rates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Conversion Rates
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
