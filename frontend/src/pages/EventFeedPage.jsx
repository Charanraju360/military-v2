import React, { useEffect, useState } from "react";
import { apiClient } from "../api/client";
import Navbar, { navigate } from "../components/Navbar";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FilterIcon,
  LayersIcon,
  RefreshIcon,
  SearchIcon,
} from "../components/ui/Icons";

export default function EventFeedPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialCategory = urlParams.get("category") || "";

  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [category, setCategory] = useState(initialCategory);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [keyword, setKeyword] = useState("");

  const pageSize = 10;

  const loadEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, page_size: pageSize };
      if (category) params.category = category;
      if (dateFrom) params.date_from = new Date(dateFrom).toISOString();
      if (dateTo) params.date_to = new Date(dateTo).toISOString();

      const data = await apiClient.fetchEvents(params);
      let items = data.items || [];

      // Optional client-side keyword filtering if requested on feed
      if (keyword.trim()) {
        const lower = keyword.toLowerCase();
        items = items.filter(
          (it) =>
            (it.summary && it.summary.toLowerCase().includes(lower)) ||
            (it.category && it.category.toLowerCase().includes(lower))
        );
      }

      setEvents(items);
      setTotal(data.total || items.length);
    } catch (err) {
      setError(err.message || "Failed to load events.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [page, category, dateFrom, dateTo]);

  const formatDate = (isoString) => {
    if (!isoString) return "N/A";
    try {
      return new Date(isoString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch (_) {
      return isoString;
    }
  };

  const categories = [
    { value: "", label: "All Classifications" },
    { value: "ATTACK", label: "Direct Action / Attacks" },
    { value: "DRILL", label: "Military Drills & Exercises" },
    { value: "GEOPOLITICS", label: "Geopolitical Developments" },
    { value: "AGREEMENT", label: "Defense Pacts & Procurements" },
    { value: "PEACE_DEAL", label: "Ceasefire & Negotiations" },
    { value: "OTHER_MILITARY", label: "General Military Activity" },
  ];

  const handleResetFilters = () => {
    setCategory("");
    setDateFrom("");
    setDateTo("");
    setKeyword("");
    setPage(1);
    window.history.replaceState({}, "", "/events");
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="min-h-screen bg-[#F7F5F0] text-[#25231F] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-6">
        {/* Page Context Header */}
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3 pb-4 border-b border-[#E6E2DA]">
          <div>
            <div className="text-[11px] font-mono uppercase text-[#706D66]">
              Intelligence Repository / Event Feed
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-medium tracking-tight text-[#25231F] mt-1">
              Clustered Intelligence Events
            </h1>
            <p className="text-xs sm:text-sm text-[#706D66] mt-1">
              Multi-source synthesized event briefs generated from open-source military articles.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs text-[#706D66] font-mono">
            <span>Showing {events.length} of {total} events</span>
          </div>
        </div>

        {/* Layout: Sidebar Filters + Main Events Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Filters Sidebar */}
          <aside className="bg-[#FFFFFF] border border-[#E6E2DA] rounded-md p-5 space-y-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between pb-2 border-b border-[#F0EDE6]">
              <div className="flex items-center space-x-1.5 text-xs font-semibold uppercase tracking-wider text-[#25231F]">
                <FilterIcon size={13} className="text-[#858078]" />
                <span>Filters</span>
              </div>
              {(category || dateFrom || dateTo || keyword) && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-[11px] text-[#C96A4A] hover:text-[#B85C3E] font-medium"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Keyword Search Filter */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase text-[#706D66] block">
                Filter by Keyword
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. naval, drone, radar..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") loadEvents();
                  }}
                  className="w-full bg-[#FFFFFF] border border-[#DEDAD2] rounded-md px-3 py-1.5 text-xs text-[#25231F] placeholder-[#8F8A80] focus:border-[#C96A4A] focus:outline-none"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase text-[#706D66] block">
                Classification
              </label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-[#FFFFFF] border border-[#DEDAD2] rounded-md px-2.5 py-1.5 text-xs text-[#25231F] focus:border-[#C96A4A] focus:outline-none"
              >
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase text-[#706D66] block">
                Date From
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-[#FFFFFF] border border-[#DEDAD2] rounded-md px-2.5 py-1.5 text-xs text-[#25231F] focus:border-[#C96A4A] focus:outline-none"
              />
            </div>

            {/* Date To */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase text-[#706D66] block">
                Date To
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-[#FFFFFF] border border-[#DEDAD2] rounded-md px-2.5 py-1.5 text-xs text-[#25231F] focus:border-[#C96A4A] focus:outline-none"
              />
            </div>

            <div className="pt-2">
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={loadEvents}
              >
                Apply Criteria
              </Button>
            </div>
          </aside>

          {/* Main Events Feed Column */}
          <div className="lg:col-span-3 space-y-4">
            {error && (
              <div className="bg-[#FDF2F2] border border-[#EFC7C7] rounded-md p-4 text-xs text-[#9B3838]">
                <span className="font-semibold">Error:</span> {error}
              </div>
            )}

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="bg-[#FFFFFF] border border-[#E6E2DA] rounded-md p-5 h-36 animate-pulse space-y-3"
                  >
                    <div className="h-4 bg-[#F0EDE6] rounded w-1/4"></div>
                    <div className="h-4 bg-[#F0EDE6] rounded w-full"></div>
                    <div className="h-4 bg-[#F0EDE6] rounded w-5/6"></div>
                  </div>
                ))}
              </div>
            ) : events.length === 0 ? (
              <div className="bg-[#FFFFFF] border border-[#E6E2DA] rounded-md p-10 text-center space-y-3">
                <div className="w-10 h-10 mx-auto rounded border border-[#E0D9CD] bg-[#F7F5F0] flex items-center justify-center text-[#858078]">
                  <LayersIcon size={20} />
                </div>
                <h3 className="text-base font-serif font-medium text-[#25231F]">
                  No intelligence events match current criteria
                </h3>
                <p className="text-xs text-[#706D66] max-w-md mx-auto">
                  Adjust your classification or date filters, or initiate a pipeline run to ingest fresh open-source military reports.
                </p>
                <div className="pt-2 flex justify-center space-x-2">
                  <Button variant="outline" size="sm" onClick={handleResetFilters}>
                    Clear Filters
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => navigate("/pipeline")}>
                    Pipeline Control
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((evt) => {
                  const title =
                    evt.summary && evt.summary.length > 90
                      ? evt.summary.slice(0, 90).replace(/\s+[^\s]*$/, "") + "..."
                      : evt.summary || `Intelligence Event #${evt.id.slice(-6)}`;

                  return (
                    <article
                      key={evt.id}
                      onClick={() => navigate(`/events/${evt.id}`)}
                      className="bg-[#FFFFFF] border border-[#E6E2DA] hover:border-[#D0C9BC] rounded-md p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-colors cursor-pointer group space-y-3"
                    >
                      {/* Top Metadata Line */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant={evt.category || "OTHER_MILITARY"}>
                            {evt.category || "OTHER_MILITARY"}
                          </Badge>
                          <span className="text-[11px] font-mono text-[#858078]">
                            {evt.article_count || 1}{" "}
                            {evt.article_count === 1 ? "source article" : "source articles"}
                          </span>
                        </div>

                        <div className="text-[11px] font-mono text-[#858078] flex items-center space-x-1">
                          <CalendarIcon size={12} />
                          <span>
                            {formatDate(evt.latest_article_at || evt.first_article_at)}
                          </span>
                        </div>
                      </div>

                      {/* Editorial Title */}
                      <h2 className="text-base font-serif font-medium text-[#25231F] group-hover:text-[#C96A4A] transition-colors leading-snug">
                        {title}
                      </h2>

                      {/* Summary Excerpt */}
                      <p className="text-xs sm:text-sm text-[#47423B] leading-relaxed line-clamp-5 whitespace-pre-line">
                        {evt.summary || "No collective summary text available."}
                      </p>

                      {/* Footer Actions & ID */}
                      <div className="pt-3 border-t border-[#F0EDE6] flex items-center justify-between text-xs">
                        <span className="font-mono text-[11px] text-[#858078]">
                          REF: {evt.id}
                        </span>
                        <span className="text-[#C96A4A] group-hover:text-[#B85C3E] font-medium flex items-center space-x-1">
                          <span>Inspect Event Intelligence Report</span>
                          <ChevronRightIcon size={13} />
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-[#E6E2DA]">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeftIcon size={12} />
                  <span>Previous</span>
                </Button>

                <span className="text-xs font-mono text-[#706D66]">
                  Page {page} of {totalPages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <span>Next</span>
                  <ChevronRightIcon size={12} />
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
