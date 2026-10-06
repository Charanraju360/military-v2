import React, { useEffect, useState } from "react";
import { apiClient } from "../api/client";
import {
  AssistantIcon,
  EventsIcon,
  MoonIcon,
  OverviewIcon,
  PipelineIcon,
  SearchIcon,
  SourcesIcon,
  SunIcon,
} from "./ui/Icons";

export function navigate(path) {
  if (window.location.pathname + window.location.search === path) return;
  window.history.pushState({}, "", path);
  window.dispatchEvent(new Event("popstate"));
}

export default function Navbar() {
  const currentPath = window.location.pathname;
  const [searchQuery, setSearchQuery] = useState("");
  const [pipelineState, setPipelineState] = useState(null);
  const [isDark, setIsDark] = useState(() => {
    return document.documentElement.classList.contains("dark");
  });

  const toggleTheme = () => {
    if (document.documentElement.classList.contains("dark")) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("osint_theme", "light");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("osint_theme", "dark");
      setIsDark(true);
    }
  };

  useEffect(() => {
    let mounted = true;
    const checkStatus = async () => {
      try {
        const data = await apiClient.fetchPipelineStatus();
        if (mounted) setPipelineState(data);
      } catch (_) {}
    };
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const navItems = [
    { label: "Overview", path: "/", Icon: OverviewIcon, exact: true },
    { label: "Events", path: "/events", Icon: EventsIcon },
    { label: "Sources", path: "/sources", Icon: SourcesIcon },
    { label: "Assistant", path: "/assistant", Icon: AssistantIcon },
    { label: "Pipeline", path: "/pipeline", Icon: PipelineIcon },
  ];

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="bg-[#FAF6E9] dark:bg-[#1C2117] border-b border-[#DDD2A8] dark:border-[#343B2A] sticky top-0 z-40 text-[#242918] dark:text-[#F1E8C7]">
      {/* Top Analyst Context Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-14 flex items-center justify-between gap-4">
          {/* Logo & Platform Name */}
          <div
            className="flex items-center space-x-3 cursor-pointer select-none group"
            onClick={() => navigate("/")}
          >
            <div className="flex flex-col">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-sm tracking-tight text-[#242918] dark:text-[#F1E8C7]">
                  OSINT-EIP
                </span>
                <span className="text-[10px] uppercase font-mono font-medium tracking-wider px-1.5 py-0.2 rounded bg-[#9CA764]/20 dark:bg-[#9CA764]/25 text-[#333D1F] dark:text-[#E5EEBC] border border-[#9CA764]/40">
                  MIL-INTEL
                </span>
              </div>
              <span className="text-[11px] text-[#6B7354] dark:text-[#9A947A] hidden sm:inline leading-none mt-0.5">
                Event Intelligence Platform
              </span>
            </div>
          </div>

          {/* Quick Search Bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="flex-1 max-w-sm hidden md:block"
          >
            <div className="relative flex items-center">
              <span className="absolute left-2.5 text-[#6B7354] dark:text-[#857F65] pointer-events-none">
                <SearchIcon size={14} />
              </span>
              <input
                type="text"
                placeholder="Search events, entities, or locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#FCF9EF] dark:bg-[#191E15] border border-[#DDD2A8] dark:border-[#38412F] rounded-md pl-8 pr-3 py-1.5 text-xs text-[#242918] dark:text-[#F1E8C7] placeholder-[#7F8863] dark:placeholder-[#7C765E] focus:border-[#9CA764] focus:outline-none transition-colors"
              />
            </div>
          </form>

          {/* Controls: Theme Toggle & Pipeline Indicator */}
          <div className="flex items-center space-x-2.5">
            {/* Dark / Light Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center space-x-1.5 px-2 py-1 rounded border border-[#DDD2A8] dark:border-[#343B2A] bg-[#FAF6E9] dark:bg-[#1F241A] hover:bg-[#F2EAC8] dark:hover:bg-[#282F21] transition-colors text-xs text-[#474F33] dark:text-[#D8CFB0]"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle theme"
            >
              {isDark ? (
                <>
                  <SunIcon size={13} className="text-[#9CA764]" />
                  <span className="hidden sm:inline font-mono text-[11px]">Light</span>
                </>
              ) : (
                <>
                  <MoonIcon size={13} className="text-[#6B7354]" />
                  <span className="hidden sm:inline font-mono text-[11px]">Dark</span>
                </>
              )}
            </button>

            {/* Pipeline State Indicator */}
            <button
              type="button"
              onClick={() => navigate("/pipeline")}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded border border-[#DDD2A8] dark:border-[#343B2A] bg-[#FAF6E9] dark:bg-[#1F241A] hover:bg-[#F2EAC8] dark:hover:bg-[#282F21] transition-colors text-[11px] text-[#474F33] dark:text-[#D8CFB0]"
              title="Pipeline Operational Status"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  pipelineState?.running
                    ? "bg-[#9CA764] animate-pulse"
                    : "bg-[#7A8747]"
                }`}
              />
              <span className="font-medium hidden sm:inline">
                {pipelineState?.running
                  ? `Pipeline: ${pipelineState.current_phase || "running"}`
                  : "Pipeline: Ready"}
              </span>
              <span className="sm:hidden font-medium">
                {pipelineState?.running ? "Running" : "Ready"}
              </span>
            </button>
          </div>
        </div>

        {/* Primary Analytical Navigation Tabs */}
        <nav className="flex items-center space-x-1 overflow-x-auto border-t border-[#DDD2A8] dark:border-[#343B2A] py-1 -mb-[1px]">
          {navItems.map((item) => {
            const isActive = item.exact
              ? currentPath === "/"
              : currentPath === item.path ||
                (item.path !== "/" && currentPath.startsWith(item.path));

            const { Icon } = item;

            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-[#9CA764]/20 dark:bg-[#9CA764]/25 text-[#242918] dark:text-[#F1E8C7] font-semibold border-b-2 border-[#9CA764]"
                    : "text-[#5C6448] dark:text-[#A39B7C] hover:text-[#242918] dark:hover:text-[#F1E8C7] hover:bg-[#9CA764]/10 dark:hover:bg-[#9CA764]/15"
                }`}
              >
                <Icon
                  size={14}
                  className={isActive ? "text-[#7A8747] dark:text-[#9CA764]" : "text-[#737C5A] dark:text-[#857F65]"}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
