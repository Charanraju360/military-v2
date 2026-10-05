import React from "react";

export default function Table({ children, className = "" }) {
  return (
    <div className="w-full overflow-x-auto rounded-md border border-[#E6E2DA] bg-[#FFFFFF] shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <table className={`w-full text-left text-xs sm:text-sm text-[#38342E] ${className}`}>
        {children}
      </table>
    </div>
  );
}
