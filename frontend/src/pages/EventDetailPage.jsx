import React, { useEffect, useState } from "react";
import { apiClient } from "../api/client";

import Navbar, { navigate } from "../components/Navbar";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Table from "../components/ui/Table";

export default function EventDetailPage() {
  const eventId = window.location.pathname.replace(/^\/events\/?/, "").split("/")[0].split("?")[0];
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!eventId) return;
    const loadDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiClient.fetchEventDetail(eventId);
        setEvent(data);
      } catch (err) {
        setError(err.message || "Failed to load event detail.");
      } finally {
        setLoading(false);
      }
    };
    loadDetail();
  }, [eventId]);

  const formatDate = (isoString) => {
    if (!isoString) return "N/A";
    return new Date(isoString).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Back Link */}
        <button
          type="button"
          onClick={() => navigate("/")}
          className="inline-flex items-center text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          ← Back to Event Feed
        </button>

        {loading ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 animate-pulse space-y-4">
            <div className="h-6 bg-slate-800 rounded w-1/4"></div>
            <div className="h-20 bg-slate-800 rounded w-full"></div>
          </div>
        ) : error ? (
          <div className="bg-red-950/50 border border-red-800/60 rounded-xl p-6 text-red-300">
            <h3 className="font-bold text-lg">Error loading event</h3>
            <p className="text-sm mt-1">{error}</p>
          </div>
        ) : !event ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
            Event not found.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header Badges & Actions */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <Badge variant={event.category || "OTHER_MILITARY"}>
                    {event.category || "OTHER_MILITARY"}
                  </Badge>
                  <Badge
                    variant={
                      (event.credibility_score || 50) >= 75
                        ? "high_trust"
                        : (event.credibility_score || 50) >= 50
                        ? "mid_trust"
                        : "low_trust"
                    }
                  >
                    {Math.round(event.credibility_score || 50)}% Credibility Score
                  </Badge>
                  <Badge variant={event.summary_source || "omniroute"}>
                    {event.summary_source === "omniroute" ? "AI-generated" : "Auto-extracted (TextRank)"}
                  </Badge>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate("/assistant")}
                >
                  💬 Ask Assistant about this event
                </Button>
              </div>

              {/* Collective Summary Section */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                  Collective Event Summary ({event.articles?.length || 1} member {event.articles?.length === 1 ? "article" : "articles"})
                </h2>
                <p className="text-base text-slate-100 leading-relaxed bg-slate-950/60 p-4 rounded-lg border border-slate-800/80">
                  {event.summary}
                </p>
              </div>

              {/* Entity Tags */}
              {event.entities && event.entities.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-semibold uppercase text-slate-400">Extracted Entities:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {event.entities.map((ent, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-800 border border-slate-700 text-slate-300"
                      >
                        <span className="text-slate-500 mr-1 font-mono text-[10px]">{ent.type}</span>
                        {ent.text}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Member Articles Table */}
            <div className="space-y-3">
              <h3 className="text-base font-bold text-slate-200">
                Member Articles ({event.articles?.length || 0})
              </h3>
              <Table>
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-800/50 text-slate-400 font-semibold text-xs">
                    <th className="p-3">Title</th>
                    <th className="p-3">Source</th>
                    <th className="p-3">Published Date</th>
                    <th className="p-3 text-right">URL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {event.articles && event.articles.length > 0 ? (
                    event.articles.map((art) => (
                      <tr key={art.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-medium text-slate-200">{art.title}</td>
                        <td className="p-3 text-slate-400 text-xs">{art.source}</td>
                        <td className="p-3 text-slate-400 text-xs">{formatDate(art.published_at)}</td>
                        <td className="p-3 text-right">
                          <a
                            href={art.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-indigo-400 hover:underline"
                          >
                            Open Link ↗
                          </a>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-slate-500">
                        No articles attached.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
