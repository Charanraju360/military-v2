import React, { useEffect, useState } from "react";
import { apiClient } from "../api/client";

import Navbar, { navigate } from "../components/Navbar";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";

export default function EventFeedPage() {
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [category, setCategory] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const loadEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, page_size: 12 };
      if (category) params.category = category;
      if (dateFrom) params.date_from = new Date(dateFrom).toISOString();
      if (dateTo) params.date_to = new Date(dateTo).toISOString();

      const data = await apiClient.fetchEvents(params);
      setEvents(data.items || []);
      setTotal(data.total || 0);
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
    return new Date(isoString).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const categories = [
    "ATTACK",
    "GEOPOLITICS",
    "PEACE_DEAL",
    "AGREEMENT",
    "DRILL",
    "OTHER_MILITARY",
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Military Intelligence Feed
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Live clustered military events ingested from open-source OSINT intelligence feeds.
            </p>
          </div>
          <Button variant="primary" onClick={() => navigate("/pipeline")}>
            ⚙️ Pipeline Control
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filter Sidebar */}
          <aside className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5 h-fit">
            <h2 className="text-base font-bold text-slate-200 border-b border-slate-800 pb-2">
              Filters
            </h2>

            {/* Category Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-slate-400">Category</label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-slate-400">Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Date To */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-slate-400">Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Reset Filters */}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                setCategory("");
                setDateFrom("");
                setDateTo("");
                setPage(1);
              }}
            >
              Reset Filters
            </Button>
          </aside>

          {/* Main Feed Content */}
          <div className="lg:col-span-3 space-y-6">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-5 h-48 animate-pulse space-y-3"
                  >
                    <div className="h-4 bg-slate-800 rounded w-1/3"></div>
                    <div className="h-4 bg-slate-800 rounded w-full"></div>
                    <div className="h-4 bg-slate-800 rounded w-4/5"></div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="bg-red-950/50 border border-red-800/60 rounded-xl p-5 text-red-300">
                <p className="font-semibold">Error loading event feed</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            ) : events.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center space-y-4">
                <div className="text-4xl">🛰️</div>
                <h3 className="text-lg font-bold text-slate-200">No events found</h3>
                <p className="text-sm text-slate-400 max-w-md mx-auto">
                  No military events match your current filter parameters, or the database is clean. Run the pipeline to ingest new intelligence.
                </p>
                <Button variant="primary" onClick={() => navigate("/pipeline")}>
                  Go to Pipeline Control
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {events.map((evt) => (
                  <Card
                    key={evt.id}
                    hover
                    onClick={() => navigate(`/events/${evt.id}`)}
                    className="flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      {/* Card Top Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant={evt.category || "OTHER_MILITARY"}>
                          {evt.category || "OTHER_MILITARY"}
                        </Badge>
                      </div>

                      {/* Summary Excerpt */}
                      <p className="text-sm text-slate-200 line-clamp-3 leading-relaxed">
                        {evt.summary || "No summary text available."}
                      </p>
                    </div>

                    {/* Card Footer Info */}
                    <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-xs text-slate-400">
                      <div>
                        <span>📅 {formatDate(evt.first_article_at || evt.latest_article_at)}</span>
                        {evt.latest_article_at !== evt.first_article_at && (
                          <span> – {formatDate(evt.latest_article_at)}</span>
                        )}
                      </div>
                      <span className="font-semibold text-indigo-400">
                        {evt.article_count || 1} {evt.article_count === 1 ? "article" : "articles"} →
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {total > 12 && (
              <div className="flex items-center justify-between border-t border-slate-800 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  ← Previous
                </Button>
                <span className="text-xs font-medium text-slate-400">
                  Page {page} of {Math.ceil(total / 12)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= Math.ceil(total / 12)}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next →
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
