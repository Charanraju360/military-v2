import React, { useEffect, useState } from "react";
import { apiClient } from "../api/client";

import Navbar, { navigate } from "../components/Navbar";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";

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
      setTotal(data.total || 0);
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
      window.history.replaceState({}, "", `/search?q=${encodeURIComponent(query.trim())}`);
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
    return new Date(isoString).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Search Header */}
        <div className="space-y-4">
          <h1 className="text-2xl font-extrabold text-white">Military OSINT Search</h1>
          
          <form onSubmit={handleFormSubmit} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Search military news, events, weapons, drills..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Button type="submit" variant="primary" size="lg">
              Search
            </Button>
          </form>

          {/* Mode Toggle Controls */}
          <div className="flex items-center space-x-3">
            <span className="text-xs font-semibold uppercase text-slate-400">Search Mode:</span>
            <div className="inline-flex bg-slate-900 p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => handleModeToggle("semantic")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  mode === "semantic"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                🧠 Semantic Vector Search
              </button>
              <button
                type="button"
                onClick={() => handleModeToggle("keyword")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  mode === "keyword"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                🔤 Keyword Search
              </button>
            </div>
          </div>
        </div>

        {/* Results Area */}
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-5 h-28 animate-pulse"></div>
              ))}
            </div>
          ) : error ? (
            <div className="bg-red-950/50 border border-red-800/60 rounded-xl p-5 text-red-300">
              <p className="font-semibold">Search error</p>
              <p className="text-sm">{error}</p>
            </div>
          ) : query.trim() && results.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400 space-y-2">
              <div className="text-3xl">🔍</div>
              <h3 className="font-bold text-slate-200">No events matched your query</h3>
              <p className="text-xs text-slate-500">Try adjusting your keywords or switching search mode.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {results.length > 0 && (
                <p className="text-xs text-slate-400">
                  Found {total} {total === 1 ? "result" : "results"} for "{query}" in {mode} mode
                </p>
              )}

              {results.map((item) => (
                <Card
                  key={item.id}
                  hover
                  onClick={() => navigate(`/events/${item.id}`)}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <Badge variant={item.category || "OTHER_MILITARY"}>
                        {item.category || "OTHER_MILITARY"}
                      </Badge>
                      {item.relevance_score !== undefined && (
                        <span className="text-xs font-semibold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
                          {Math.round(item.relevance_score * 100)}% Match
                        </span>
                      )}
                    </div>

                    <span className="text-xs text-slate-500">
                      📅 {formatDate(item.latest_article_at)}
                    </span>
                  </div>

                  <p className="text-sm text-slate-200 leading-relaxed">
                    {item.summary}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
