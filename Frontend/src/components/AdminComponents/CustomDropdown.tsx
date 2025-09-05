"use client";

import type React from "react";
import { useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface StatusDropdownProps {
  currentStatus: string;
  onStatusChange: (status: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const StatusDropdownAdmin: React.FC<StatusDropdownProps> = ({
  currentStatus,
  onStatusChange,
  isOpen,
  onToggle,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  const statusOptions = [
    { value: "pending", label: "Pending", color: "text-yellow-700" },
    { value: "confirmed", label: "Confirmed", color: "text-green-700" },
    { value: "completed", label: "Completed", color: "text-blue-700" },
    { value: "refund", label: "Refund", color: "text-cyan-600" },
    { value: "cancelled", label: "Cancel", color: "text-red-700" },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        onToggle();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onToggle]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "text-green-600";
      case "pending":
        return "text-yellow-600";
      case "cancelled":
        return "text-red-600";
      case "refund":
        return "text-cyan-600";
      case "completed":
        return "text-blue-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100";
      case "pending":
        return "bg-yellow-100";
      case "cancelled":
        return "bg-red-100";
      case "refund":
        return "bg-cyan-100";
      case "completed":
        return "bg-blue-100";
      default:
        return "bg-gray-100";
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={onToggle}
        className={`inline-flex items-center px-3 py-1 rounded text-sm font-medium ${getStatusBg(currentStatus)} ${getStatusColor(currentStatus)} hover:opacity-80 transition-opacity duration-150`}
      >
        <span className="capitalize">
          {currentStatus === "cancelled" ? "Cancel" : currentStatus}
        </span>
        <ChevronDown
          className={`ml-1 h-3 w-3 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded shadow-lg z-50">
          <div className="py-1">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => onStatusChange(option.value)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 transition-colors duration-150 ${
                  option.value === currentStatus
                    ? "bg-blue-50 text-blue-700"
                    : option.color
                }`}
                disabled={option.value === currentStatus}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusDropdownAdmin;
