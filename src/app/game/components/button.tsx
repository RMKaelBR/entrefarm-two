import React from "react";
import clsx from "clsx";

type ButtonVariant = "primary" | "secondary" | "warning" | "danger";

type ButtonProps = {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: ButtonVariant;
  className?: string;
  type?: "button" | "submit" | "reset";
};

const baseStyles =
  "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500",
  secondary:
    "bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-400",
  warning:
    "bg-yellow-500 text-white hover:bg-yellow-600 focus:ring-yellow-400",
  danger:
    "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
};

const disabledStyles =
  "opacity-50 cursor-not-allowed hover:bg-inherit";

export const Button: React.FC<ButtonProps> = ({
  label,
  onClick,
  disabled = false,
  variant = "primary",
  className,
  type = "button",
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        baseStyles,
        variantStyles[variant],
        disabled && disabledStyles,
        className
      )}
    >
      {label}
    </button>
  );
};
