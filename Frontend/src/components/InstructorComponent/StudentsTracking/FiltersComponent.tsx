import { useState } from "react";
import { SortOrder, StudentFilter } from "../../../types/Student";
import { Filter } from "lucide-react";
import { Dropdown } from "./Dropdowm";

interface FilterComponentProps {
  onFilterChange: (filter: StudentFilter) => void;
  currentFilter: StudentFilter;
}

export const FilterComponent: React.FC<FilterComponentProps> = ({
  onFilterChange,
  currentFilter,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSort, setSelectedSort] = useState<SortOrder | undefined>(
    currentFilter.sortBy
  );

  const sortOptions = [
    { value: SortOrder.RECENT_TO_OLDEST, label: "Recent to oldest" },
    { value: SortOrder.OLDEST_TO_RECENT, label: "Oldest to recent" },
    { value: SortOrder.A_TO_Z_ORDER, label: "A to Z Order" },
    { value: SortOrder.Z_TO_A_ORDER, label: "Z to A Order" },
    { value: SortOrder.REMAINING_HOURS, label: "Remaining Hours" },
  ];

  const handleSortChange = (sortValue: string) => {
    const newSort = sortValue as SortOrder;
    setSelectedSort(newSort);
    onFilterChange({
      ...currentFilter,
      sortBy: newSort,
    });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="dsp-dashboard-button--primary flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300 focus:ring-offset-2"
      >
        <Filter className="w-4 h-4" />
        Filters
      </button>

      {isOpen && (
        <div className="absolute right-0 z-20 w-80 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Sort</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort by
                </label>
                <Dropdown
                  isOpen={false}
                  onToggle={() => {}}
                  onSelect={handleSortChange}
                  options={sortOptions}
                  selectedValue={selectedSort}
                  placeholder="Select sorting option"
                />
              </div>

              <div className="space-y-2">
                {sortOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center space-x-2"
                  >
                    <input
                      type="radio"
                      name="sort"
                      value={option.value}
                      checked={selectedSort === option.value}
                      onChange={(e) => handleSortChange(e.target.value)}
                      className="w-4 h-4 text-violet-600 border-gray-300 focus:ring-violet-500"
                    />
                    <span className="text-sm text-gray-700">
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
