import React from "react";

export default function Card({ children, className = "", onClick, hover = false }) {
  return (
    <div
      onClick={onClick}
      className={`bg-[#FAF6E9] dark:bg-[#1F241A] border border-[#DDD2A8] dark:border-[#343B2A] rounded-md p-4 sm:p-5 shadow-[0_1px_2px_rgba(36,41,24,0.03)] transition-colors ${
        hover
          ? "hover:border-[#9CA764] hover:bg-[#FCF9EF] dark:hover:bg-[#252B1F] cursor-pointer"
          : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
