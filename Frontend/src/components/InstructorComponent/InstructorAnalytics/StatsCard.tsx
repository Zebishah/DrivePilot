import React from "react";
import { DivideIcon as LucideIcon, Info } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  bgColor: string;
  iconColor: string;
  tooltip?: string;
  onClick?: () => void;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon: Icon,
  bgColor,
  iconColor,
  tooltip,
  onClick,
}) => {
  return (
    <div
      className={`${bgColor} rounded-2xl p-6 text-center shadow-sm w-full ${
        onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""
      }`}
      onClick={onClick}
    >
      <div
        className={`${iconColor} w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3`}
      >
        <Icon size={24} className="text-white" />
      </div>
      <div className="flex items-center justify-center gap-1 mb-2">
        <h3 className="text-sm font-medium text-gray-700">{title}</h3>
        {tooltip && (
          <span className="relative group inline-flex">
            <Info className="w-4 h-4 text-gray-500" />
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block whitespace-normal rounded-md bg-gray-900 px-4 py-2 text-xs leading-relaxed text-white shadow-lg max-w-sm w-56 text-left z-10">
              {tooltip}
            </span>
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
};
