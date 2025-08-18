import React from "react";
import { DivideIcon as LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  bgColor: string;
  iconColor: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon: Icon,
  bgColor,
  iconColor,
}) => {
  return (
    <div className={`${bgColor} rounded-2xl p-6 text-center shadow-sm w-full`}>
      <div
        className={`${iconColor} w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3`}
      >
        <Icon size={24} className="text-white" />
      </div>
      <h3 className="text-sm font-medium text-gray-700 mb-2">{title}</h3>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
};
