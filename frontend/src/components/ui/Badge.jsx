import React from "react";

export default function Badge({ children, variant = "default", className = "" }) {
  const variants = {
    default: "bg-slate-700 text-slate-200 border-slate-600",
    ATTACK: "bg-red-950/80 text-red-400 border-red-800/60",
    GEOPOLITICS: "bg-blue-950/80 text-blue-400 border-blue-800/60",
    PEACE_DEAL: "bg-emerald-950/80 text-emerald-400 border-emerald-800/60",
    AGREEMENT: "bg-cyan-950/80 text-cyan-400 border-cyan-800/60",
    DRILL: "bg-amber-950/80 text-amber-400 border-amber-800/60",
    OTHER_MILITARY: "bg-purple-950/80 text-purple-400 border-purple-800/60",
    omniroute: "bg-indigo-950/80 text-indigo-400 border-indigo-800/60",
    textrank_fallback: "bg-amber-950/80 text-amber-400 border-amber-800/60",
    high_trust: "bg-emerald-950/80 text-emerald-400 border-emerald-800/60",
    mid_trust: "bg-amber-950/80 text-amber-400 border-amber-800/60",
    low_trust: "bg-rose-950/80 text-rose-400 border-rose-800/60",
  };

  const style = variants[variant] || variants.default;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border ${style} ${className}`}
    >
      {children}
    </span>
  );
}
