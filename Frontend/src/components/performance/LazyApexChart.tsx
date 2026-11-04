import { lazy, Suspense, useMemo } from "react";
import type React from "react";
import type ReactApexChart from "react-apexcharts";
import { useTheme } from "@mui/material/styles";
import type { ApexOptions } from "apexcharts";
import { intelligentTokens as c } from "../../themes/intelligentTokens";

type ApexChartProps = React.ComponentProps<typeof ReactApexChart>;

const ApexChart = lazy(() => import("react-apexcharts"));

export default function LazyApexChart(props: ApexChartProps) {
  const { palette } = useTheme();
  const options = useMemo<ApexOptions | undefined>(() => {
    const original = props.options || {};
    const yAxes = Array.isArray(original.yaxis)
      ? original.yaxis
      : [original.yaxis || {}];
    const styledAxes = yAxes.map((axis) => ({
      ...axis,
      labels: {
        ...axis.labels,
        style: { ...axis.labels?.style, colors: c.muted },
      },
      axisBorder: { ...axis.axisBorder, color: c.border },
      axisTicks: { ...axis.axisTicks, color: c.border },
    }));
    return {
      ...original,
      colors: [...c.chart],
      theme: {
        ...original.theme,
        mode: palette.mode,
        monochrome: { ...original.theme?.monochrome, enabled: false },
      },
      chart: {
        ...original.chart,
        background: "transparent",
        foreColor: c.muted,
        fontFamily: "Inter, sans-serif",
      },
      grid: { ...original.grid, borderColor: c.border },
      legend: {
        ...original.legend,
        labels: { ...original.legend?.labels, colors: c.muted },
      },
      tooltip: { ...original.tooltip, theme: palette.mode },
      xaxis: {
        ...original.xaxis,
        labels: {
          ...original.xaxis?.labels,
          style: { ...original.xaxis?.labels?.style, colors: c.muted },
        },
        axisBorder: { ...original.xaxis?.axisBorder, color: c.border },
        axisTicks: { ...original.xaxis?.axisTicks, color: c.border },
      },
      yaxis: Array.isArray(original.yaxis) ? styledAxes : styledAxes[0],
      plotOptions: {
        ...original.plotOptions,
        radialBar: {
          ...original.plotOptions?.radialBar,
          track: {
            ...original.plotOptions?.radialBar?.track,
            background: c.border,
          },
          dataLabels: {
            ...original.plotOptions?.radialBar?.dataLabels,
            name: {
              ...original.plotOptions?.radialBar?.dataLabels?.name,
              color: c.muted,
            },
            value: {
              ...original.plotOptions?.radialBar?.dataLabels?.value,
              color: c.ink,
            },
          },
        },
      },
    };
  }, [palette.mode, props.options]);
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
      <ApexChart {...props} options={options} />
    </Suspense>
  );
}
