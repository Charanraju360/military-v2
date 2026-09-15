import React from "react";

export default function Card({ children, className = "", onClick, hover = false }) {
  return (
    <section
      onClick={onClick}
      className={`bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg transition-all ${
        hover ? "hover:border-indigo-500/50 hover:shadow-indigo-500/10 cursor-pointer" : ""
      } ${className}`}
    >
      {children}
    </section>
  );
}
