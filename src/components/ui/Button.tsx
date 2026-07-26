"use client";

import { type ButtonHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

const variants = {
  primary: "bg-primary text-white hover:bg-primary-light active:bg-primary-dark",
  secondary: "bg-white text-text border border-border hover:bg-surface-alt active:bg-border/30",
  danger: "bg-danger text-white hover:bg-danger-dark active:bg-danger-dark",
  ghost: "text-text-secondary hover:bg-surface-alt hover:text-text active:bg-border/30",
  success: "bg-success text-white hover:bg-success-dark active:bg-success-dark",
};

const sizes = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-2.5 text-base",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, className, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(
          "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-1",
          "disabled:cursor-not-allowed disabled:opacity-50",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading && (
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
