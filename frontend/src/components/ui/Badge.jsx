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
    qwen_primary: "bg-indigo-950/80 text-indigo-400 border-indigo-800/60",
    openrouter_secondary: "bg-sky-950/80 text-sky-400 border-sky-800/60",
    structured_fallback: "bg-amber-950/80 text-amber-400 border-amber-800/60",
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
