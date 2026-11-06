import React from "react";

interface FormInputProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  type?: string;
  min?: number;
  step?: number;
  helperText?: string;
  error?: string;
}

export const FormInput: React.FC<FormInputProps> = ({
  label,
  value,
  onChange,
  placeholder = "Type Here",
  disabled = false,
  type = "text",
  min,
  step,
  helperText,
  error,
}) => {
  return (
    <div className="dsp-feedback-field">
      <label className="dsp-feedback-field__label">{label}</label>
      {helperText && <p className="dsp-feedback-field__helper">{helperText}</p>}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        min={min}
        step={step}
        inputMode={type === "number" ? "decimal" : undefined}
        aria-invalid={Boolean(error)}
        className={`dsp-feedback-input ${error ? "is-invalid" : ""} ${disabled ? "is-disabled" : ""}`}
      />
      {error && <p className="dsp-feedback-field__error" role="alert">{error}</p>}
    </div>
  );
};
