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
    "inline-flex items-center justify-center font-medium rounded-md transition-colors select-none focus:outline-none focus:ring-2 focus:ring-[#C96A4A]/25 disabled:opacity-40 disabled:cursor-not-allowed";

  const variants = {
    primary:
      "bg-[#C96A4A] hover:bg-[#B85C3E] text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-[#BA5F40]",
    secondary:
      "bg-[#FFFFFF] hover:bg-[#F4F1EA] text-[#302D27] border border-[#D8D2C6] shadow-[0_1px_1px_rgba(0,0,0,0.02)]",
    danger:
      "bg-[#9B3838] hover:bg-[#862E2E] text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-[#8B3030]",
    outline:
      "bg-transparent hover:bg-[#ECE8DF] text-[#47423B] border border-[#D5CFC3]",
    ghost:
      "bg-transparent hover:bg-[#ECE8DF] text-[#47423B]",
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
