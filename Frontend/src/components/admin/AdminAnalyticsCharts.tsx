/* eslint-disable react-refresh/only-export-components */
import { useMemo } from "react";
import type { ApexOptions } from "apexcharts";
import LazyApexChart from "../performance/LazyApexChart";
import { AdminState } from "./AdminPrimitives";
import { formatCHF } from "../../utils/money";

export type ActiveUserPoint = {
  time: string;
  students: number;
  instructors: number;
};

export type BookingPoint = {
  time: string;
  averageBookings: number;
};

export type EarningsPoint = {
  time: string;
  totalEarnings: number;
};

export type ConversionPoint = {
  time: string;
  visitors: number;
  registrations: number;
  rate: number;
};

type ChartType = "bar" | "line" | "area";

const chartColors = {
  violet: "#7C3AED",
  cyan: "#0284C7",
  green: "#16A34A",
  amber: "#D97706",
  pink: "#DB2777",
};

function formatTimeLabel(value: string) {
  const trimmed = String(value || "").trim();
  if (/^\d{2} \d{4}$/.test(trimmed)) return `W${trimmed}`;
  if (/^[A-Za-z]{3} \d{4}$/.test(trimmed)) return trimmed;
  const parsed = new Date(`${trimmed}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return trimmed;
  return parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatFullTimeLabel(value: string) {
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

function makeOptions({
  type,
  categories,
  colors,
  valueFormatter,
}: {
  type: ChartType;
  categories: string[];
  colors: string[];
  valueFormatter: (value: number) => string;
}): ApexOptions {
  return {
    chart: {
      type,
      height: 290,
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: false },
      fontFamily: "inherit",
      background: "transparent",
    },
    colors,
    dataLabels: { enabled: false },
    stroke: { curve: "smooth", width: type === "bar" ? 0 : 3 },
    fill: { opacity: type === "area" ? 0.18 : 0.92 },
    plotOptions: {
      bar: { borderRadius: 6, columnWidth: "48%" },
    },
    grid: { borderColor: "#E2E8F0", strokeDashArray: 4, padding: { left: 8, right: 8 } },
    legend: { position: "top", horizontalAlign: "left", fontSize: "12px", labels: { colors: "#64748B" } },
    xaxis: {
      categories,
      tickAmount: Math.min(8, Math.max(categories.length - 1, 1)),
      labels: { formatter: (value: string) => formatTimeLabel(value), style: { colors: "#94A3B8", fontSize: "11px" }, hideOverlappingLabels: true, trim: true },
      axisBorder: { color: "#E2E8F0" },
      axisTicks: { color: "#E2E8F0" },
    },
    yaxis: { labels: { style: { colors: "#94A3B8", fontSize: "11px" } } },
    tooltip: { x: { formatter: (value: string) => formatFullTimeLabel(value) }, y: { formatter: (value: number) => valueFormatter(value) } },
    responsive: [{ breakpoint: 700, options: { chart: { height: 250 }, legend: { fontSize: "11px" }, xaxis: { labels: { rotate: -35 } } } }],
  };
}

function EmptyChart({ description }: { description: string }) {
  return <div className="dsp-admin-chart__empty"><AdminState type="empty" title="No data for this period" description={description} /></div>;
}

export function AdminAnalyticsChart({
  type,
  categories,
  series,
  colors,
  valueFormatter = (value) => String(value),
  emptyDescription = "There are no records in the selected analytics period.",
}: {
  type: ChartType;
  categories: string[];
  series: Array<{ name: string; data: number[] }>;
  colors: string[];
  valueFormatter?: (value: number) => string;
  emptyDescription?: string;
}) {
  const hasData = series.some((item) => item.data.some((value) => Number(value) !== 0));
  const options = useMemo(() => makeOptions({ type, categories, colors, valueFormatter }), [categories, colors, type, valueFormatter]);
  if (!categories.length || !hasData) return <EmptyChart description={emptyDescription} />;
  return <div className="dsp-admin-chart" aria-label="Analytics chart"><LazyApexChart options={options} series={series} type={type} height={290} /></div>;
}

export function ActiveUsersChart({ points }: { points: ActiveUserPoint[] }) {
  const visible = points.slice(-12);
  return <AdminAnalyticsChart
    type="bar"
    categories={visible.map((point) => point.time)}
    series={[{ name: "Students", data: visible.map((point) => point.students) }, { name: "Instructors", data: visible.map((point) => point.instructors) }]}
    colors={[chartColors.violet, chartColors.cyan]}
    emptyDescription="Paid student activity and delivered instructor activity will appear here."
  />;
}

export function BookingActivityChart({ points }: { points: BookingPoint[] }) {
  const visible = points.slice(-12);
  return <AdminAnalyticsChart
    type="line"
    categories={visible.map((point) => point.time)}
    series={[{ name: "Average bookings per instructor", data: visible.map((point) => Number(point.averageBookings || 0)) }]}
    colors={[chartColors.violet]}
    valueFormatter={(value) => value.toFixed(2)}
    emptyDescription="Paid booking activity will appear here once an instructor has delivered a lesson in the selected period."
  />;
}

export function EarningsChart({ points }: { points: EarningsPoint[] }) {
  const visible = points.slice(-12);
  return <AdminAnalyticsChart
    type="area"
    categories={visible.map((point) => point.time)}
    series={[{ name: "Net instructor earnings", data: visible.map((point) => Number(point.totalEarnings || 0)) }]}
    colors={[chartColors.green]}
    valueFormatter={formatCHF}
    emptyDescription="Net instructor earnings will appear here when paid lessons are marked completed."
  />;
}

export function ConversionChart({ points }: { points: ConversionPoint[] }) {
  const visible = points.slice(-12);
  return <AdminAnalyticsChart
    type="line"
    categories={visible.map((point) => point.time)}
    series={[{ name: "Visitors", data: visible.map((point) => point.visitors) }, { name: "Registrations", data: visible.map((point) => point.registrations) }]}
    colors={[chartColors.amber, chartColors.pink]}
    valueFormatter={(value) => String(Math.round(value))}
    emptyDescription="Visitor and registration activity will appear here when tracking records are available."
  />;
}

export function sumSeries(values: number[]) {
  return values.reduce((sum, value) => sum + Number(value || 0), 0);
}

export function averageSeries(values: number[]) {
  const nonZero = values.filter((value) => Number(value) > 0);
  return nonZero.length ? sumSeries(nonZero) / nonZero.length : 0;
}
