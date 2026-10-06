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
    <div className="min-h-screen bg-[#F1E8C7] dark:bg-[#161912] text-[#242918] dark:text-[#F1E8C7] flex flex-col font-sans transition-colors duration-200">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3 pb-4 border-b border-[#DDD2A8] dark:border-[#343B2A]">
          <div>
            <div className="text-[11px] font-mono uppercase text-[#6A734D] dark:text-[#B5BC94] tracking-wider">
              Intelligence Retrieval / Query Index
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-medium tracking-tight text-[#191F0E] dark:text-[#F1E8C7] mt-1">
              Military OSINT Search
            </h1>
            <p className="text-xs sm:text-sm text-[#555C3E] dark:text-[#CBD1B4] mt-1">
              Search across clustered military events using dense semantic vector embeddings or literal lexical matching.
            </p>
          </div>
        </div>

        {/* Search Input Box & Controls */}
        <section className="bg-[#FAF6E9] dark:bg-[#1F241A] border border-[#DDD2A8] dark:border-[#343B2A] rounded-md p-5 shadow-sm space-y-4">
          <form onSubmit={handleFormSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-2.5 text-[#6A734D] dark:text-[#B5BC94]">
                <SearchIcon size={16} />
              </span>
              <input
                type="text"
                placeholder="Search weapons, armed forces, drills, strikes, or regional theatres..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-[#FCF9EF] dark:bg-[#161912] border border-[#DDD2A8] dark:border-[#343B2A] rounded-md pl-9 pr-3 py-2 text-xs sm:text-sm text-[#191F0E] dark:text-[#F1E8C7] placeholder-[#8C887B] focus:border-[#9CA764] focus:outline-none"
              />
            </div>
            <Button type="submit" variant="primary" size="md">
              Search
            </Button>
          </form>

          {/* Mode Switch */}
          <div className="flex items-center space-x-3 text-xs pt-1 border-t border-[#DDD2A8] dark:border-[#343B2A]">
            <span className="font-mono uppercase text-[11px] text-[#6A734D] dark:text-[#B5BC94]">
              Search Mode:
            </span>
            <div className="inline-flex rounded border border-[#DDD2A8] dark:border-[#343B2A] bg-[#F1E8C7] dark:bg-[#161912] p-0.5">
              <button
                type="button"
                onClick={() => handleModeToggle("semantic")}
                className={`px-3 py-1 rounded text-xs transition-colors font-medium ${
                  mode === "semantic"
                    ? "bg-[#FAF6E9] dark:bg-[#252B1F] text-[#191F0E] dark:text-[#F1E8C7] shadow-sm"
                    : "text-[#6A734D] dark:text-[#B5BC94] hover:text-[#191F0E] dark:hover:text-[#F1E8C7]"
                }`}
              >
                Semantic Vector Search
              </button>
              <button
                type="button"
                onClick={() => handleModeToggle("keyword")}
                className={`px-3 py-1 rounded text-xs transition-colors font-medium ${
                  mode === "keyword"
                    ? "bg-[#FAF6E9] dark:bg-[#252B1F] text-[#191F0E] dark:text-[#F1E8C7] shadow-sm"
                    : "text-[#6A734D] dark:text-[#B5BC94] hover:text-[#191F0E] dark:hover:text-[#F1E8C7]"
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
                  className="bg-[#FAF6E9] dark:bg-[#1F241A] border border-[#DDD2A8] dark:border-[#343B2A] rounded-md p-5 h-28 animate-pulse space-y-2"
                >
                  <div className="h-4 bg-[#F1E8C7] dark:bg-[#252B1F] rounded w-1/4"></div>
                  <div className="h-4 bg-[#F1E8C7] dark:bg-[#252B1F] rounded w-full"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="bg-[#FBEAE8] dark:bg-[#2A1E1E] border border-[#E8B4B4] dark:border-[#522525] rounded-md p-4 text-xs text-[#8C3A3A] dark:text-[#E07A7A]">
              <span className="font-semibold">Search query error:</span> {error}
            </div>
          ) : query.trim() && results.length === 0 ? (
            <div className="bg-[#FAF6E9] dark:bg-[#1F241A] border border-[#DDD2A8] dark:border-[#343B2A] rounded-md p-10 text-center space-y-2">
              <div className="w-10 h-10 mx-auto rounded border border-[#DDD2A8] dark:border-[#343B2A] bg-[#F1E8C7] dark:bg-[#161912] flex items-center justify-center text-[#6A734D] dark:text-[#9CA764]">
                <SearchIcon size={20} />
              </div>
              <h3 className="font-serif font-medium text-base text-[#191F0E] dark:text-[#F1E8C7]">
                No matching intelligence events retrieved
              </h3>
              <p className="text-xs text-[#555C3E] dark:text-[#CBD1B4] max-w-sm mx-auto">
                No events matched "{query}" in {mode} mode. Try broadening terms or switching modes.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {results.length > 0 && (
                <div className="text-xs font-mono text-[#6A734D] dark:text-[#B5BC94] pb-1">
                  Retrieved {total} result(s) for "{query}" via {mode} retrieval
                </div>
              )}

              {results.map((item) => (
                <article
                  key={item.id}
                  onClick={() => navigate(`/events/${item.id}`)}
                  className="bg-[#FAF6E9] dark:bg-[#1F241A] border border-[#DDD2A8] dark:border-[#343B2A] hover:border-[#9CA764] dark:hover:border-[#9CA764] rounded-md p-5 shadow-sm transition-colors cursor-pointer group space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <Badge variant={item.category || "OTHER_MILITARY"}>
                        {item.category || "OTHER_MILITARY"}
                      </Badge>
                      {item.relevance_score !== undefined && (
                        <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-[#F4EED9] dark:bg-[#252B1F] border border-[#DDD2A8] dark:border-[#343B2A] text-[#4F6830] dark:text-[#9CA764]">
                          Relevance: {Math.round(item.relevance_score * 100)}%
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] font-mono text-[#6A734D] dark:text-[#B5BC94] flex items-center space-x-1">
                      <CalendarIcon size={12} />
                      <span>{formatDate(item.latest_article_at)}</span>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-[#191F0E] dark:text-[#F1E8C7] leading-relaxed line-clamp-5 whitespace-pre-line font-serif">
                    {item.summary}
                  </p>

                  <div className="pt-2 border-t border-[#DDD2A8] dark:border-[#343B2A] flex items-center justify-between text-xs">
                    <span className="font-mono text-[11px] text-[#6A734D] dark:text-[#B5BC94]">
                      ID: #{item.id.slice(-6)}
                    </span>
                    <span className="text-[#4F6830] dark:text-[#9CA764] group-hover:text-[#384A22] dark:group-hover:text-[#B5BC94] font-medium flex items-center space-x-1">
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
