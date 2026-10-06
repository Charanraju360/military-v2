import React, { useEffect, useState } from "react";
import { apiClient } from "../api/client";
import Navbar, { navigate } from "../components/Navbar";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import {
  CalendarIcon,
  ChevronRightIcon,
  LayersIcon,
  SearchIcon,
} from "../components/ui/Icons";

export default function SearchPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialQuery = urlParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [mode, setMode] = useState("semantic");
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const performSearch = async (searchQuery, searchMode) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setTotal(0);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.searchEvents(searchQuery.trim(), searchMode);
      setResults(data.items || []);
      setTotal(data.total || (data.items ? data.items.length : 0));
    } catch (err) {
      setError(err.message || "Search failed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery, mode);
    }
  }, []);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      window.history.replaceState(
        {},
        "",
        `/search?q=${encodeURIComponent(query.trim())}`
      );
      performSearch(query.trim(), mode);
    }
  };

  const handleModeToggle = (newMode) => {
    setMode(newMode);
    if (query.trim()) {
      performSearch(query.trim(), newMode);
    }
  };

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

  return (
    <div className="min-h-screen bg-[#F7F5F0] text-[#25231F] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3 pb-4 border-b border-[#E6E2DA]">
          <div>
            <div className="text-[11px] font-mono uppercase text-[#706D66]">
              Intelligence Retrieval / Query Index
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-medium tracking-tight text-[#25231F] mt-1">
              Military OSINT Search
            </h1>
            <p className="text-xs sm:text-sm text-[#706D66] mt-1">
              Search across clustered military events using dense semantic vector embeddings or literal lexical matching.
            </p>
          </div>
        </div>

        {/* Search Input Box & Controls */}
        <section className="bg-[#FFFFFF] border border-[#E6E2DA] rounded-md p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-4">
          <form onSubmit={handleFormSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-2.5 text-[#858078]">
                <SearchIcon size={16} />
              </span>
              <input
                type="text"
                placeholder="Search weapons, armed forces, drills, strikes, or regional theatres..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-[#FFFFFF] border border-[#DEDAD2] rounded-md pl-9 pr-3 py-2 text-xs sm:text-sm text-[#25231F] placeholder-[#8F8A80] focus:border-[#C96A4A] focus:outline-none"
              />
            </div>
            <Button type="submit" variant="primary" size="md">
              Search
            </Button>
          </form>

          {/* Mode Switch */}
          <div className="flex items-center space-x-3 text-xs pt-1 border-t border-[#F0EDE6]">
            <span className="font-mono uppercase text-[11px] text-[#706D66]">
              Search Mode:
            </span>
            <div className="inline-flex rounded border border-[#DEDAD2] bg-[#F7F5F0] p-0.5">
              <button
                type="button"
                onClick={() => handleModeToggle("semantic")}
                className={`px-3 py-1 rounded text-xs transition-colors font-medium ${
                  mode === "semantic"
                    ? "bg-[#FFFFFF] text-[#25231F] shadow-[0_1px_1px_rgba(0,0,0,0.04)]"
                    : "text-[#706D66] hover:text-[#25231F]"
                }`}
              >
                Semantic Vector Search
              </button>
              <button
                type="button"
                onClick={() => handleModeToggle("keyword")}
                className={`px-3 py-1 rounded text-xs transition-colors font-medium ${
                  mode === "keyword"
                    ? "bg-[#FFFFFF] text-[#25231F] shadow-[0_1px_1px_rgba(0,0,0,0.04)]"
                    : "text-[#706D66] hover:text-[#25231F]"
                }`}
              >
                Keyword Text Search
              </button>
            </div>
          </div>
        </section>

        {/* Results Stream */}
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-[#FFFFFF] border border-[#E6E2DA] rounded-md p-5 h-28 animate-pulse space-y-2"
                >
                  <div className="h-4 bg-[#F0EDE6] rounded w-1/4"></div>
                  <div className="h-4 bg-[#F0EDE6] rounded w-full"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="bg-[#FDF2F2] border border-[#EFC7C7] rounded-md p-4 text-xs text-[#9B3838]">
              <span className="font-semibold">Search query error:</span> {error}
            </div>
          ) : query.trim() && results.length === 0 ? (
            <div className="bg-[#FFFFFF] border border-[#E6E2DA] rounded-md p-10 text-center space-y-2">
              <div className="w-10 h-10 mx-auto rounded border border-[#E0D9CD] bg-[#F7F5F0] flex items-center justify-center text-[#858078]">
                <SearchIcon size={20} />
              </div>
              <h3 className="font-serif font-medium text-base text-[#25231F]">
                No matching intelligence events retrieved
              </h3>
              <p className="text-xs text-[#706D66] max-w-sm mx-auto">
                No events matched "{query}" in {mode} mode. Try broadening terms or switching modes.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {results.length > 0 && (
                <div className="text-xs font-mono text-[#706D66] pb-1">
                  Retrieved {total} result(s) for "{query}" via {mode} retrieval
                </div>
              )}

              {results.map((item) => (
                <article
                  key={item.id}
                  onClick={() => navigate(`/events/${item.id}`)}
                  className="bg-[#FFFFFF] border border-[#E6E2DA] hover:border-[#D0C9BC] rounded-md p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-colors cursor-pointer group space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <Badge variant={item.category || "OTHER_MILITARY"}>
                        {item.category || "OTHER_MILITARY"}
                      </Badge>
                      {item.relevance_score !== undefined && (
                        <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-[#FBF1ED] border border-[#ECCDC1] text-[#B85C3E]">
                          Relevance: {Math.round(item.relevance_score * 100)}%
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] font-mono text-[#858078] flex items-center space-x-1">
                      <CalendarIcon size={12} />
                      <span>{formatDate(item.latest_article_at)}</span>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-[#302E2A] leading-relaxed line-clamp-5 whitespace-pre-line">
                    {item.summary}
                  </p>

                  <div className="pt-2 border-t border-[#F0EDE6] flex items-center justify-between text-xs">
                    <span className="font-mono text-[11px] text-[#858078]">
                      ID: #{item.id.slice(-6)}
                    </span>
                    <span className="text-[#C96A4A] group-hover:text-[#B85C3E] font-medium flex items-center space-x-1">
                      <span>View Intelligence Dossier</span>
                      <ChevronRightIcon size={12} />
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
