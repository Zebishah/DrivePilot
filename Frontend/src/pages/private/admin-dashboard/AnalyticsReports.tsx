import { useMemo, useState } from "react";
import { useQuery } from "@apollo/client";
import { Activity, BarChart3, CalendarDays, CreditCard, Eye, RefreshCw, UsersRound } from "lucide-react";
import { GET_ADMIN_ANALYTICS } from "../../../graphql/Queries/AdminContact";
import { ActiveUsersChart, BookingActivityChart, ConversionChart, EarningsChart, averageSeries, sumSeries, type ActiveUserPoint, type BookingPoint, type ConversionPoint, type EarningsPoint } from "../../../components/admin/AdminAnalyticsCharts";
import { AdminMetricCard, AdminPage, AdminPageHeader, AdminSection, AdminState } from "../../../components/admin/AdminPrimitives";
import { formatCHF } from "../../../utils/money";

type Tab = "usage" | "bookings" | "financial" | "traffic";
type FilterValue = "ALL_TIME" | "LAST_WEEK" | "THIS_WEEK" | "LAST_MONTH" | "THIS_MONTH" | "LAST_YEAR" | "THIS_YEAR" | "LAST_6_MONTHS" | "CUSTOM";

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "usage", label: "Usage" },
  { id: "bookings", label: "Bookings" },
  { id: "financial", label: "Financial" },
  { id: "traffic", label: "Traffic" },
];

const filterOptions: Array<{ value: FilterValue; label: string }> = [
  { value: "THIS_YEAR", label: "This year" },
  { value: "THIS_MONTH", label: "This month" },
  { value: "LAST_MONTH", label: "Last month" },
  { value: "LAST_6_MONTHS", label: "Last 6 months" },
  { value: "THIS_WEEK", label: "This week" },
  { value: "LAST_WEEK", label: "Last week" },
  { value: "LAST_YEAR", label: "Last year" },
  { value: "ALL_TIME", label: "All time" },
  { value: "CUSTOM", label: "Custom range" },
];

function FilterBar({
  value,
  fromDate,
  toDate,
  onChange,
  onFromDateChange,
  onToDateChange,
  onApplyCustom,
}: {
  value: FilterValue;
  fromDate: string;
  toDate: string;
  onChange: (value: FilterValue) => void;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
  onApplyCustom: () => void;
}) {
  return <div className="dsp-admin-filter-bar" aria-label="Analytics filters">
    <label><span>Reporting period</span><select value={value} onChange={(event) => onChange(event.target.value as FilterValue)}>{filterOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>
    {value === "CUSTOM" && <>
      <label><span>From</span><input type="date" value={fromDate} onChange={(event) => onFromDateChange(event.target.value)} /></label>
      <label><span>To</span><input type="date" value={toDate} min={fromDate || undefined} onChange={(event) => onToDateChange(event.target.value)} /></label>
      <button type="button" className="dsp-admin-button dsp-admin-button--secondary" disabled={!fromDate || !toDate} onClick={onApplyCustom}>Apply range</button>
    </>}
    <span className="dsp-admin-filter-bar__hint">Filters use the existing Admin analytics API.</span>
  </div>;
}

function chartTitle(tab: Tab) {
  if (tab === "usage") return "Paid activity by period";
  if (tab === "bookings") return "Average bookings per instructor";
  if (tab === "financial") return "Net instructor earnings";
  return "Visitors and registrations";
}

function chartDescription(tab: Tab) {
  if (tab === "usage") return "Students with paid lessons and instructors who delivered paid lessons.";
  if (tab === "bookings") return "Paid lessons divided by instructors who delivered a paid lesson in each period.";
  if (tab === "financial") return "Instructor earnings after DSP commission for paid lessons marked completed.";
  return "Visitor records compared with student and instructor registrations.";
}

export default function AnalyticsReports() {
  const [tab, setTab] = useState<Tab>("usage");
  const [period, setPeriod] = useState<FilterValue>("THIS_YEAR");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [appliedCustomFrom, setAppliedCustomFrom] = useState("");
  const [appliedCustomTo, setAppliedCustomTo] = useState("");

  const variables = useMemo(() => {
    if (period === "ALL_TIME") return { filter: undefined };
    if (period === "CUSTOM") {
      if (!appliedCustomFrom || !appliedCustomTo) return { filter: { filterType: "THIS_YEAR" } };
      return { filter: { filterType: "CUSTOM", fromDate: appliedCustomFrom, toDate: appliedCustomTo } };
    }
    return { filter: { filterType: period } };
  }, [appliedCustomFrom, appliedCustomTo, period]);

  const { data, loading, error, refetch } = useQuery(GET_ADMIN_ANALYTICS, { variables, fetchPolicy: "cache-and-network" });
  const analytics = data?.getAdminAnalytics;
  const overall = analytics?.overallStats;
  const graph = analytics?.graphData;
  const activeUsers = (graph?.activeUsers || []) as ActiveUserPoint[];
  const bookings = (graph?.bookingsPerInstructor || []) as BookingPoint[];
  const earnings = (graph?.totalEarnings || []) as EarningsPoint[];
  const conversion = (graph?.conversionRates || []) as ConversionPoint[];

  const trafficTotals = {
    visitors: sumSeries(conversion.map((point) => point.visitors)),
    registrations: sumSeries(conversion.map((point) => point.registrations)),
  };
  const conversionRate = trafficTotals.visitors ? (trafficTotals.registrations / trafficTotals.visitors) * 100 : 0;
  const earningsTotal = sumSeries(earnings.map((point) => point.totalEarnings));
  const averageInstructorEarnings = averageSeries(((graph?.averageRevenuePerInstructor || []) as Array<{ averageRevenue: number }>).map((point) => point.averageRevenue));

  const rangeLabel = period === "CUSTOM" && appliedCustomFrom && appliedCustomTo
    ? `${appliedCustomFrom} to ${appliedCustomTo}`
    : filterOptions.find((option) => option.value === period)?.label || "This year";

  const metrics = tab === "usage"
    ? [
        { label: "Registrations", value: overall?.totalRegistrations || 0, helper: overall?.totalRegistrations ? `${overall?.studentRegistrations || 0} students · ${overall?.instructorRegistrations || 0} instructors` : "No registrations recorded", icon: UsersRound, tone: "violet" as const },
        { label: "Student activity", value: sumSeries(activeUsers.map((point) => point.students)), helper: activeUsers.some((point) => point.students > 0) ? "Students active per period (summed)" : "No paid student activity", icon: UsersRound, tone: "cyan" as const },
        { label: "Instructor activity", value: sumSeries(activeUsers.map((point) => point.instructors)), helper: activeUsers.some((point) => point.instructors > 0) ? "Instructors active per period (summed)" : "No delivered paid activity", icon: Activity, tone: "green" as const },
        { label: "Tracked periods", value: activeUsers.length, helper: activeUsers.length ? rangeLabel : "No periods returned", icon: BarChart3, tone: "amber" as const },
      ]
    : tab === "bookings"
      ? [
          { label: "Lessons booked", value: overall?.totalLessonsBooked || 0, helper: overall?.totalLessonsBooked ? `${overall?.upcomingLessonsBooked || 0} upcoming` : "No lessons booked", icon: CalendarDays, tone: "violet" as const },
          { label: "Completed lessons", value: overall?.completedLessonsBooked || 0, helper: overall?.completedLessonsBooked ? "Completed in the selected period" : "No completed lessons", icon: CalendarDays, tone: "cyan" as const },
          { label: "Attendance rate", value: `${overall?.attendanceRate || 0}%`, helper: `${overall?.lessonAttendance || 0} attended lessons`, icon: Activity, tone: "green" as const },
          { label: "Reserved hours / student", value: overall?.averageReservedHoursPerStudent || 0, helper: "Average in the selected period", icon: BarChart3, tone: "amber" as const },
        ]
      : tab === "financial"
        ? [
            { label: "Net earnings", value: formatCHF(earningsTotal), helper: earningsTotal ? "Selected-period instructor earnings" : "No completed paid earnings", icon: CreditCard, tone: "green" as const },
            { label: "Average / instructor", value: formatCHF(averageInstructorEarnings), helper: averageInstructorEarnings ? "Average period value returned by API" : "No instructor earnings recorded", icon: CreditCard, tone: "violet" as const },
            { label: "Completed lessons", value: overall?.completedLessonsBooked || 0, helper: "Lessons contributing to earnings", icon: CalendarDays, tone: "cyan" as const },
            { label: "Earnings periods", value: earnings.length, helper: rangeLabel, icon: BarChart3, tone: "amber" as const },
          ]
        : [
            { label: "Visitors", value: trafficTotals.visitors, helper: trafficTotals.visitors ? "Tracked visitor records" : "No visitor records", icon: Eye, tone: "cyan" as const },
            { label: "Registrations", value: trafficTotals.registrations, helper: trafficTotals.registrations ? "Student and instructor records" : "No registrations recorded", icon: UsersRound, tone: "violet" as const },
            { label: "Conversion rate", value: `${conversionRate.toFixed(1)}%`, helper: "Registrations divided by visitors", icon: Activity, tone: "green" as const },
            { label: "Traffic periods", value: conversion.length, helper: rangeLabel, icon: BarChart3, tone: "amber" as const },
          ];

  if (loading && !data) return <AdminPage><AdminState type="loading" title="Loading analytics" description="Preparing the available marketplace reports." /></AdminPage>;
  if (error && !data) return <AdminPage><AdminState type="error" title="We couldn’t load analytics" description="Refresh the report and try again." onRetry={() => void refetch()} /></AdminPage>;

  return <AdminPage>
    <AdminPageHeader title="Analytics & reports" description="Understand marketplace growth, usage and financial performance." action={<button type="button" className="dsp-admin-button dsp-admin-button--secondary" onClick={() => void refetch()}><RefreshCw size={16} />Refresh</button>} />
    <FilterBar value={period} fromDate={customFrom} toDate={customTo} onChange={setPeriod} onFromDateChange={setCustomFrom} onToDateChange={setCustomTo} onApplyCustom={() => { setAppliedCustomFrom(customFrom); setAppliedCustomTo(customTo); }} />
    <section className="dsp-admin-metrics" aria-label={`${rangeLabel} analytics summary`}>{metrics.map((metric) => <AdminMetricCard {...metric} key={metric.label} />)}</section>
    <AdminSection title="Marketplace reports" description={`Showing ${rangeLabel.toLowerCase()} data returned by the Admin analytics API.`}>
      <div className="dsp-admin-tabs" role="tablist" aria-label="Analytics report tabs">{tabs.map((item) => <button type="button" role="tab" aria-selected={tab === item.id} className={tab === item.id ? "is-active" : ""} onClick={() => setTab(item.id)} key={item.id}>{item.label}</button>)}</div>
      <div className="dsp-admin-card dsp-admin-report-card"><div className="dsp-admin-card__header"><div><h2>{chartTitle(tab)}</h2><p>{chartDescription(tab)}</p></div>{tab === "traffic" ? <Eye size={19} color="#0EA5E9" aria-hidden="true" /> : tab === "financial" ? <CreditCard size={19} color="#16A34A" aria-hidden="true" /> : <BarChart3 size={19} color="#7C3AED" aria-hidden="true" />}</div><div className="dsp-admin-card__body">
        {tab === "usage" && <ActiveUsersChart points={activeUsers} />}
        {tab === "bookings" && <BookingActivityChart points={bookings} />}
        {tab === "financial" && <EarningsChart points={earnings} />}
        {tab === "traffic" && <ConversionChart points={conversion} />}
      </div></div>
    </AdminSection>
    <AdminSection title="Report details" description="Definitions are kept aligned with the fields returned by the existing API.">
      <div className="dsp-admin-detail-grid">
        <div className="dsp-admin-card dsp-admin-detail-card"><span>Selected period</span><strong>{rangeLabel}</strong><small>Applied to the analytics query</small></div>
        <div className="dsp-admin-card dsp-admin-detail-card"><span>Average reserved hours / student</span><strong>{overall?.averageReservedHoursPerStudent || 0}</strong><small>Calculated from booked lesson slots</small></div>
        <div className="dsp-admin-card dsp-admin-detail-card"><span>Attendance records</span><strong>{overall?.lessonAttendance || 0}</strong><small>Lessons explicitly marked completed</small></div>
        <div className="dsp-admin-card dsp-admin-detail-card"><span>Data source</span><strong>Admin analytics</strong><small>Only backend-provided values are visualized</small></div>
      </div>
    </AdminSection>
  </AdminPage>;
}
