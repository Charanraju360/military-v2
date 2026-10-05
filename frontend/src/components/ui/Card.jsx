import React from "react";

export default function Card({ children, className = "", onClick, hover = false }) {
  return (
    <div
      onClick={onClick}
      className={`bg-[#FFFFFF] border border-[#E6E2DA] rounded-md p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-colors ${
        hover
          ? "hover:border-[#D0C9BC] hover:bg-[#FDFCFB] cursor-pointer"
          : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
