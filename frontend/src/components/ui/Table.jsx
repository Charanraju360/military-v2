import React from "react";

export default function Table({ children, className = "" }) {
  return (
    <div className="w-full overflow-x-auto rounded-md border border-[#DDD2A8] dark:border-[#343B2A] bg-[#FAF6E9] dark:bg-[#1F241A] shadow-[0_1px_2px_rgba(36,41,24,0.02)]">
      <table className={`w-full text-left text-xs sm:text-sm text-[#242918] dark:text-[#F1E8C7] ${className}`}>
        {children}
      </table>
    </div>
  );
}
