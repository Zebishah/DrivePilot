import React, { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { skillOptions } from "../../../types/LessonFeedback";

interface SkillsDropdownProps {
  selectedSkills: string[];
  onSkillToggle: (skill: string) => void;
  disabled?: boolean;
  label?: string;
  helperText?: string;
  error?: string;
}

export const SkillsDropdown: React.FC<SkillsDropdownProps> = ({
  selectedSkills,
  onSkillToggle,
  disabled = false,
  label = "Skills Worked on During the lesson",
  helperText = "Select the areas practiced during this lesson.",
  error,
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
    <div className="dsp-feedback-field">
      <label className="dsp-feedback-field__label">{label}</label>
      <p className="dsp-feedback-field__helper">{helperText}</p>
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          className={`dsp-feedback-select ${error ? "is-invalid" : ""} ${disabled ? "is-disabled" : ""}`}
        >
          <span className={selectedSkills.length === 0 ? "is-placeholder" : ""}>
            {selectedSkills.length > 0 ? (
              <span className="dsp-feedback-select__chips">
                {selectedSkills.map((skillValue) => {
                  const skill = skillOptions.find((option) => option.value === skillValue);
                  return <span className="dsp-feedback-chip" key={skillValue}>{skill?.label || skillValue}</span>;
                })}
              </span>
            ) : getSelectedSkillsDisplay()}
          </span>
          {!disabled && <ChevronDown size={18} className={isOpen ? "is-open" : ""} aria-hidden="true" />}
        </button>

        {isOpen && !disabled && (
          <div className="dsp-feedback-select__menu">
            {skillOptions.map((skill) => (
              <label
                key={skill.value}
                className="dsp-feedback-select__option"
              >
                <input
                  type="checkbox"
                  checked={selectedSkills.includes(skill.value)}
                  onChange={() => onSkillToggle(skill.value)}
                  className="sr-only"
                />
                <span>{skill.label}</span>
                {selectedSkills.includes(skill.value) && <Check size={16} aria-hidden="true" />}
              </label>
            ))}
          </div>
        )}
      </div>
      {error && <p className="dsp-feedback-field__error" role="alert">{error}</p>}
    </div>
  );
};
