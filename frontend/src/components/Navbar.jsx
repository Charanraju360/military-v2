import React, { useState } from "react";

export function navigate(path) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new Event("popstate"));
}

export default function Navbar() {
  const currentPath = window.location.pathname;
  const [searchQuery, setSearchQuery] = useState("");

  const navItems = [
    { label: "Event Feed", path: "/" },
    { label: "Search", path: "/search" },
    { label: "Assistant", path: "/assistant" },
    { label: "Sources", path: "/sources" },
    { label: "Pipeline Control", path: "/pipeline" },
  ];

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate("/")}>
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-500/20">
            OS
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white">OSINT-EIP</span>
            <span className="hidden sm:inline-block ml-2 text-xs font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              Military Intel
            </span>
          </div>
        </div>

        {/* Global Navigation Links */}
        <nav className="hidden md:flex items-center space-x-1">
          {navItems.map((item) => {
            const isActive =
              item.path === "/"
                ? currentPath === "/"
                : currentPath.startsWith(item.path);

            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Quick Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xs">
          <div className="relative">
            <input
              type="text"
              placeholder="Search military intel..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button type="submit" className="absolute right-2 top-2 text-slate-400 hover:text-white">
              🔍
            </button>
          </div>
        </form>
      </div>

      {/* Mobile nav row */}
      <div className="md:hidden flex overflow-x-auto border-t border-slate-800 px-4 py-2 space-x-2">
        {navItems.map((item) => {
          const isActive =
            item.path === "/"
              ? currentPath === "/"
              : currentPath.startsWith(item.path);

          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              className={`whitespace-nowrap px-3 py-1 rounded text-xs font-medium ${
                isActive ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-300"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
}
