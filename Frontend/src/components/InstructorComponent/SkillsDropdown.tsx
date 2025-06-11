import React, { useState } from "react";
import { skillOptions } from "../../types/LessonFeedback";

interface SkillsDropdownProps {
  selectedSkills: string[];
  onSkillToggle: (skill: string) => void;
  disabled?: boolean;
  label?: string;
}

export const SkillsDropdown: React.FC<SkillsDropdownProps> = ({
  selectedSkills,
  onSkillToggle,
  disabled = false,
  label = "Skills Worked on During the lesson",
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const getSelectedSkillsDisplay = () => {
    if (selectedSkills.length === 0) return "Select";
    if (selectedSkills.length === 1) {
      const skill = skillOptions.find((opt) => opt.value === selectedSkills[0]);
      return skill?.label || "";
    }

    const selectedLabels = selectedSkills
      .map((val) => skillOptions.find((opt) => opt.value === val)?.label)
      .filter(Boolean);

    return selectedLabels.join(", ");
  };

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`w-full px-4 py-3 text-left bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5FC2D3] focus:border-[#5FC2D3] flex justify-between items-center ${
            disabled ? "bg-gray-50 cursor-not-allowed" : "cursor-pointer"
          }`}
        >
          <span
            className={
              selectedSkills.length === 0 ? "text-gray-500" : "text-gray-900"
            }
          >
            {getSelectedSkillsDisplay()}
          </span>
          {!disabled && (
            <svg
              className={`w-5 h-5 transform transition-transform ${isOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          )}
        </button>

        {isOpen && !disabled && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {skillOptions.map((skill) => (
              <label
                key={skill.value}
                className="flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedSkills.includes(skill.value)}
                  onChange={() => onSkillToggle(skill.value)}
                  className="w-4 h-4 text-[#4f9fad] border-gray-300 rounded focus:ring-[#5FC2D3]"
                />
                <span className="ml-3 text-gray-700">{skill.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
