import { lazy, Suspense } from "react";
import type React from "react";
import type ReactApexChart from "react-apexcharts";

type ApexChartProps = React.ComponentProps<typeof ReactApexChart>;

const ApexChart = lazy(() => import("react-apexcharts"));

export default function LazyApexChart(props: ApexChartProps) {
  return (
    <Suspense
      fallback={
        <div
          className="chart-loading"
          role="status"
          aria-label="Loading chart"
        />
      }
    >
      <ApexChart {...props} />
    </Suspense>
  );
}
