import React from "react";

interface ProgressMetricProps {
  title: string;
  subtitle: string;
  percentage: number;
  value: string;
  color: "green" | "red" | "teal" | string; // allow hex values too
  badge?: string;
}

export const ProgressMetric: React.FC<ProgressMetricProps> = ({
  title,
  subtitle,
  percentage,
  value,
  color,
  badge,
}) => {
  const getColorClasses = (color: string) => {
    // ✅ Case 1: Hex color
    if (color.startsWith("#")) {
      return {
        bg: "", // Tailwind class not used
        text: "",
        badge: "",
        style: {
          backgroundColor: color,
        },
        textStyle: {
          color: color,
        },
      };
    }

    // ✅ Case 2: Tailwind color presets
    switch (color) {
      case "green":
        return {
          bg: "bg-green-500",
          text: "text-green-600",
          badge: "bg-green-100 text-green-800",
          style: {},
          textStyle: {},
        };
      case "red":
        return {
          bg: "bg-red-500",
          text: "text-red-600",
          badge: "bg-red-100 text-red-800",
          style: {},
          textStyle: {},
        };
      case "teal":
        return {
          bg: "bg-teal-400",
          text: "text-teal-500",
          badge: "bg-teal-100 text-teal-800",
          style: {},
          textStyle: {},
        };
      default:
        return {
          bg: "bg-gray-500",
          text: "text-gray-600",
          badge: "bg-gray-100 text-gray-800",
          style: {},
          textStyle: {},
        };
    }
  };

  const colors = getColorClasses(color);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      {/* Title + Badge */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {badge && (
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${colors.badge}`}
          >
            {badge}
          </span>
        )}
      </div>

      {/* Subtitle */}
      <p className="text-sm text-gray-600 mb-4">{subtitle}</p>

      {/* Value */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span
            className={`text-3xl font-bold ${colors.text}`}
            style={colors.textStyle}
          >
            {value}
          </span>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-gray-600">C</span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${colors.bg} transition-all duration-500`}
          style={{
            ...colors.style,
            width: `${Math.min(percentage, 100)}%`,
          }}
        ></div>
      </div>
    </div>
  );
};
