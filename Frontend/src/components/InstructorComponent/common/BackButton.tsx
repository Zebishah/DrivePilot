import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export interface BackButtonProps {
  /** Custom navigation path. If not provided, uses browser history back */
  to?: string;
  /** Custom text label. Defaults to "Back" */
  label?: string;
  /** Button variant style */
  variant?: "default" | "outline" | "ghost" | "minimal";
  /** Button size */
  size?: "sm" | "md" | "lg";
  /** Additional CSS classes */
  className?: string;
  /** Custom onClick handler - overrides default navigation */
  onClick?: () => void;
  /** Show/hide the arrow icon */
  showIcon?: boolean;
  /** Disable the button */
  disabled?: boolean;
}

export const BackButton: React.FC<BackButtonProps> = ({
  to,
  label = "Back",
  variant = "default",
  size = "md",
  className = "",
  onClick,
  showIcon = true,
  disabled = false,
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (disabled) return;

    if (onClick) {
      onClick();
    } else if (to) {
      navigate(to);
    } else {
      navigate(-1); // Go back in history
    }
  };

  // Size configurations
  const sizeStyles = {
    sm: {
      button: "px-3 py-1.5 text-sm gap-1.5",
      icon: "w-4 h-4",
    },
    md: {
      button: "px-4 py-2 text-base gap-2",
      icon: "w-5 h-5",
    },
    lg: {
      button: "px-6 py-3 text-lg gap-2.5",
      icon: "w-6 h-6",
    },
  };

  // Variant styles using your custom color #4BA1B0
  const variantStyles = {
    default: `
      bg-[#4BA1B0] text-white border border-[#4BA1B0]
      hover:bg-[#3d8a97] hover:border-[#3d8a97]
      active:bg-[#357a85] active:border-[#357a85]
      focus:ring-2 focus:ring-[#4BA1B0] focus:ring-opacity-20
      shadow-sm hover:shadow-md
      transition-all duration-200 ease-in-out
      transform hover:scale-105 active:scale-95
    `,
    outline: `
      bg-transparent text-[#4BA1B0] border-2 border-[#4BA1B0]
      hover:bg-[#4BA1B0] hover:text-white
      active:bg-[#3d8a97] active:border-[#3d8a97]
      focus:ring-2 focus:ring-[#4BA1B0] focus:ring-opacity-20
      transition-all duration-200 ease-in-out
      transform hover:scale-105 active:scale-95
    `,
    ghost: `
      bg-transparent text-[#4BA1B0] border border-transparent
      hover:bg-[#4BA1B0] hover:bg-opacity-10 hover:border-[#4BA1B0] hover:border-opacity-30
      active:bg-[#4BA1B0] active:bg-opacity-20
      focus:ring-2 focus:ring-[#4BA1B0] focus:ring-opacity-20
      transition-all duration-200 ease-in-out
    `,
    minimal: `
      bg-transparent text-[#4BA1B0] border-none p-0
      hover:text-[#3d8a97] hover:underline
      active:text-[#357a85]
      focus:outline-none focus:ring-2 focus:ring-[#4BA1B0] focus:ring-opacity-20 focus:rounded
      transition-all duration-200 ease-in-out
    `,
  };

  // Disabled styles
  const disabledStyles = `
    opacity-50 cursor-not-allowed
    hover:transform-none hover:scale-100 hover:shadow-none
    active:transform-none active:scale-100
  `;

  const buttonClasses = `
    inline-flex items-center justify-center
    font-medium rounded-lg
    ml-2 mt-2
    focus:outline-none focus:ring-offset-2
    ${sizeStyles[size].button}
    ${variantStyles[variant]}
    ${disabled ? disabledStyles : ""}
    ${className}
  `
    .trim()
    .replace(/\s+/g, " ");

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={buttonClasses}
      aria-label={`${label} button`}
    >
      {showIcon && (
        <ArrowLeft
          className={`${sizeStyles[size].icon} ${variant === "minimal" ? "mr-1" : ""}`}
          strokeWidth={2}
        />
      )}
      {label}
    </button>
  );
};
