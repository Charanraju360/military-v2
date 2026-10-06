import React from "react";

export default function Button({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  className = "",
  type = "button",
  ...props
}) {
  const base =
    "inline-flex items-center justify-center font-medium rounded transition-colors select-none focus:outline-none focus:ring-2 focus:ring-[#9CA764]/40 disabled:opacity-40 disabled:cursor-not-allowed";

  const variants = {
    primary:
      "bg-[#9CA764] hover:bg-[#8B9654] text-[#191F0E] dark:text-[#12160A] font-semibold border border-[#8C9755] shadow-[0_1px_2px_rgba(0,0,0,0.06)]",
    secondary:
      "bg-[#FAF6E9] dark:bg-[#1F241A] hover:bg-[#F2EAC8] dark:hover:bg-[#282F21] text-[#242918] dark:text-[#F1E8C7] border border-[#DDD2A8] dark:border-[#343B2A] shadow-[0_1px_1px_rgba(0,0,0,0.02)]",
    danger:
      "bg-[#8C3A35] hover:bg-[#782E2A] text-white border border-[#782E2A] shadow-[0_1px_2px_rgba(0,0,0,0.05)]",
    outline:
      "bg-transparent hover:bg-[#9CA764]/10 dark:hover:bg-[#9CA764]/15 text-[#242918] dark:text-[#F1E8C7] border border-[#DDD2A8] dark:border-[#343B2A]",
    ghost:
      "bg-transparent hover:bg-[#9CA764]/10 dark:hover:bg-[#9CA764]/15 text-[#3D442C] dark:text-[#D8CFB0]",
  };

  const sizes = {
    sm: "px-2.5 py-1 text-xs gap-1.5",
    md: "px-3.5 py-1.5 text-xs sm:text-sm gap-2",
    lg: "px-4 py-2 text-sm gap-2",
  };

  return (
    <button
      type={type}
      disabled={disabled}
      className={`${base} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
