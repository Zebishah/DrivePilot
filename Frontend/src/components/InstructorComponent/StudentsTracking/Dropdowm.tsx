import { ChevronDown } from "lucide-react";

interface DropdownProps {
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (value: string) => void;
  options: { value: string; label: string }[];
  selectedValue?: string;
  placeholder: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  isOpen,
  onToggle,
  onSelect,
  options,
  selectedValue,
  placeholder,
}) => {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <span>
          {selectedValue
            ? options.find((opt) => opt.value === selectedValue)?.label
            : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
          <div className="py-1">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onSelect(option.value);
                  onToggle();
                }}
                className={`w-full px-4 py-2 text-sm text-left hover:bg-blue-50 focus:outline-none focus:bg-blue-50 ${
                  selectedValue === option.value
                    ? "bg-blue-100 text-blue-800 font-medium"
                    : "text-gray-700"
                }`}
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
