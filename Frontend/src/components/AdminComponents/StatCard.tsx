import React from "react";

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  gradient: string;
  isPercentage?: boolean;
  suffix?: string;
}

export function StatCard({
  title,
  value,
  icon,
  gradient,
  isPercentage = false,
  suffix,
}: StatCardProps) {
  const formatValue = (val: number) => {
    if (isPercentage) {
      return `${val.toFixed(1)}%`;
    }
    if (val >= 1000000) {
      return `${(val / 1000000).toFixed(1)}M${suffix || ""}`;
    }
    if (val >= 1000) {
      return `${(val / 1000).toFixed(1)}K${suffix || ""}`;
    }
    return `${val}${suffix || ""}`;
  };

  return (
    <div
      className={`${gradient} rounded-xl shadow-sm border-0 overflow-hidden`}
    >
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white/90 mb-2">{title}</p>
            <p className="text-3xl font-bold text-white">
              {formatValue(value)}
            </p>
          </div>
          <div className="text-white/80 p-3 bg-white/10 rounded-lg">{icon}</div>
        </div>
      </div>
    </div>
  );
}
