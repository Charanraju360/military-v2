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
    <header className="bg-[#FCFBF9] border-b border-[#E6E2DA] sticky top-0 z-40 text-[#25231F]">
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
                <span className="font-semibold text-sm tracking-tight text-[#25231F]">
                  OSINT-EIP
                </span>
                <span className="text-[10px] uppercase font-mono font-medium tracking-wider px-1.5 py-0.2 rounded bg-[#EFECE5] text-[#6B655D] border border-[#DDD7CD]">
                  MIL-INTEL
                </span>
              </div>
              <span className="text-[11px] text-[#858078] hidden sm:inline leading-none mt-0.5">
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
              <span className="absolute left-2.5 text-[#858078] pointer-events-none">
                <SearchIcon size={14} />
              </span>
              <input
                type="text"
                placeholder="Search events, entities, or locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#FFFFFF] border border-[#DEDAD2] rounded-md pl-8 pr-3 py-1.5 text-xs text-[#25231F] placeholder-[#8F8A80] focus:border-[#C96A4A] focus:outline-none transition-colors"
              />
            </div>
          </form>

          {/* Controls: Theme Toggle & Pipeline Indicator */}
          <div className="flex items-center space-x-2.5">
            {/* Dark / Light Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center space-x-1.5 px-2 py-1 rounded border border-[#E6E2DA] bg-[#FFFFFF] hover:bg-[#F7F5F0] transition-colors text-xs text-[#706D66]"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle theme"
            >
              {isDark ? (
                <>
                  <SunIcon size={13} className="text-[#D97757]" />
                  <span className="hidden sm:inline font-mono text-[11px]">Light</span>
                </>
              ) : (
                <>
                  <MoonIcon size={13} className="text-[#706D66]" />
                  <span className="hidden sm:inline font-mono text-[11px]">Dark</span>
                </>
              )}
            </button>

            {/* Pipeline State Indicator */}
            <button
              type="button"
              onClick={() => navigate("/pipeline")}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded border border-[#E6E2DA] bg-[#FFFFFF] hover:bg-[#F7F5F0] transition-colors text-[11px] text-[#5C574F]"
              title="Pipeline Operational Status"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  pipelineState?.running
                    ? "bg-[#C96A4A] animate-pulse"
                    : "bg-[#4A6B4E]"
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
        <nav className="flex items-center space-x-1 overflow-x-auto border-t border-[#F0ECE4] py-1 -mb-[1px]">
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
                    ? "bg-[#ECE7DF] text-[#25231F] font-semibold border-b-2 border-[#C96A4A]"
                    : "text-[#706D66] hover:text-[#25231F] hover:bg-[#F2EFE8]"
                }`}
              >
                <Icon
                  size={14}
                  className={isActive ? "text-[#C96A4A]" : "text-[#858078]"}
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
