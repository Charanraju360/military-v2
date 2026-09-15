import React from "react";

export default function Table({ children, className = "" }) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-slate-800 bg-slate-900">
      <table className={`w-full text-left text-sm text-slate-300 ${className}`}>
        {children}
      </table>
    </div>
  );
}
