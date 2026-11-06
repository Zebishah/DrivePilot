import React, { useRef, useEffect } from "react";
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
    { value: "cancelled", label: "Cancelled", color: "text-red-700" },
    { value: "semi_cancelled", label: "Semi Cancelled", color: "text-red-600" },
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
    const statusOption = statusOptions.find((opt) => opt.value === status);
    return statusOption?.color || "text-gray-700";
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={onToggle}
        className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150"
      >
        <span className={`capitalize ${getStatusColor(currentStatus)}`}>
          {currentStatus.replace("_", " ")}
        </span>
        <ChevronDown
          className={`ml-2 h-4 w-4 text-gray-400 transition-transform duration-150 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50 animate-in fade-in duration-150">
          <div className="py-1">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => onStatusChange(option.value)}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors duration-150 ${
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
