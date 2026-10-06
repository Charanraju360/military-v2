import React, { useEffect, useState } from "react";
import { apiClient } from "../api/client";
import Navbar, { navigate } from "../components/Navbar";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import {
  ActivityIcon,
  AlertTriangleIcon,
  ArrowRightIcon,
  CalendarIcon,
  ChevronRightIcon,
  ConflictIcon,
  ExternalLinkIcon,
  GlobeIcon,
  LayersIcon,
  LocationIcon,
  RefreshIcon,
  ShieldIcon,
  SourcesIcon,
} from "../components/ui/Icons";

export default function OverviewPage() {
  const [events, setEvents] = useState([]);
  const [sources, setSources] = useState([]);
  const [pipelineStatus, setPipelineStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [eventsRes, sourcesRes, statusRes] = await Promise.allSettled([
        apiClient.fetchEvents({ page: 1, page_size: 10 }),
        apiClient.fetchSources(),
        apiClient.fetchPipelineStatus(),
      ]);

      if (eventsRes.status === "fulfilled") {
        setEvents(eventsRes.value.items || []);
      }
      if (sourcesRes.status === "fulfilled") {
        setSources(sourcesRes.value || []);
      }
      if (statusRes.status === "fulfilled") {
        setPipelineStatus(statusRes.value);
      }
    } catch (err) {
      setError(err.message || "Failed to load overview data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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

  // Derive active categories and theatre stats
  const categoryCounts = events.reduce((acc, ev) => {
    const cat = ev.category || "OTHER_MILITARY";
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const totalArticles = events.reduce(
    (sum, ev) => sum + (ev.article_count || 1),
    0
  );

  return (
    <div className="min-h-screen bg-[#F1E8C7] dark:bg-[#161912] text-[#242918] dark:text-[#F1E8C7] flex flex-col font-sans transition-colors">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-7">
        {/* Executive Context Briefing Header */}
        <section className="bg-[#FAF6E9] dark:bg-[#1F241A] border border-[#DDD2A8] dark:border-[#343B2A] rounded-md p-6 sm:p-7 shadow-[0_1px_2px_rgba(36,41,24,0.03)] space-y-4">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="space-y-1.5 max-w-3xl">
              <div className="flex items-center space-x-2 text-[11px] font-mono uppercase text-[#6B7354] dark:text-[#9A947A]">
                <span>Intelligence Briefing</span>
                <span>/</span>
                <span>Operational Synthesis</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif font-medium tracking-tight text-[#242918] dark:text-[#F1E8C7]">
                Military OSINT Intelligence Overview
              </h1>
              <p className="text-sm text-[#474F33] dark:text-[#D8CFB0] leading-relaxed pt-1">
                Continuous ingestion and automated hybrid clustering of open-source defense feeds.
                Articles are normalized, filtered for military relevance, grouped into coherent events across time and entities, and synthesized into collective multi-source briefs.
              </p>
            </div>

            <div className="flex items-center space-x-2 self-start pt-1 shrink-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={loadData}
                disabled={loading}
              >
                <RefreshIcon size={13} className={loading ? "animate-spin" : ""} />
                <span>Refresh</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate("/events")}
              >
                <span>View All Events</span>
                <ChevronRightIcon size={13} />
              </Button>
            </div>
          </div>

          {/* Analytical Intelligence Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-[#DDD2A8] dark:border-[#343B2A]">
            <div className="space-y-0.5">
              <span className="text-[11px] font-mono uppercase text-[#6B7354] dark:text-[#9A947A]">
                Active Clustered Events
              </span>
              <div className="text-xl sm:text-2xl font-serif font-semibold text-[#242918] dark:text-[#F1E8C7]">
                {events.length}
              </div>
              <span className="text-[11px] text-[#5C6448] dark:text-[#A39B7C]">
                synthesized from {totalArticles} reports
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-[11px] font-mono uppercase text-[#6B7354] dark:text-[#9A947A]">
                Monitored Feeds
              </span>
              <div className="text-xl sm:text-2xl font-serif font-semibold text-[#242918] dark:text-[#F1E8C7]">
                {sources.filter((s) => s.active !== false).length}
              </div>
              <span className="text-[11px] text-[#5C6448] dark:text-[#A39B7C]">
                active defense OSINT sources
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-[11px] font-mono uppercase text-[#6B7354] dark:text-[#9A947A]">
                Lead Theatres
              </span>
              <div className="text-xl sm:text-2xl font-serif font-semibold text-[#242918] dark:text-[#F1E8C7]">
                {Object.keys(categoryCounts).length || 0}
              </div>
              <span className="text-[11px] text-[#5C6448] dark:text-[#A39B7C]">
                event categories represented
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-[11px] font-mono uppercase text-[#6B7354] dark:text-[#9A947A]">
                Pipeline Readiness
              </span>
              <div className="text-xl sm:text-2xl font-serif font-semibold text-[#242918] dark:text-[#F1E8C7] flex items-center gap-1.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    pipelineStatus?.running
                      ? "bg-[#9CA764] animate-pulse"
                      : "bg-[#7A8747]"
                  }`}
                />
                <span>{pipelineStatus?.running ? "Ingesting" : "Operational"}</span>
              </div>
              <span className="text-[11px] text-[#5C6448] dark:text-[#A39B7C]">
                {pipelineStatus?.running
                  ? `Phase: ${pipelineStatus.current_phase}`
                  : "Database in sync"}
              </span>
            </div>
          </div>
        </section>

        {error && (
          <div className="bg-[#F7EBE8] dark:bg-[#2B1B19] border border-[#E8C7C1] dark:border-[#4E2B27] rounded-md p-4 text-xs text-[#8C3A35] dark:text-[#E58079]">
            <span className="font-semibold">Data retrieval error:</span> {error}
          </div>
        )}

        {/* Two-Column Analytic Layout: Recent Events + Category Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Main Column: Recent Events Stream (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-[#DDD2A8] dark:border-[#343B2A]">
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-serif font-medium text-[#242918] dark:text-[#F1E8C7]">
                  Recent Intelligence Events
                </h2>
                <span className="text-xs font-mono text-[#6B7354] dark:text-[#9A947A]">
                  ({events.length})
                </span>
              </div>
              <button
                type="button"
                onClick={() => navigate("/events")}
                className="text-xs text-[#7A8747] dark:text-[#9CA764] hover:text-[#68753A] dark:hover:text-[#B2BE7E] font-medium flex items-center space-x-1 transition-colors"
              >
                <span>Full Feed Archive</span>
                <ArrowRightIcon size={12} />
              </button>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-[#FAF6E9] dark:bg-[#1F241A] border border-[#DDD2A8] dark:border-[#343B2A] rounded-md p-5 h-32 animate-pulse space-y-2.5"
                  >
                    <div className="h-4 bg-[#F4ECCF] dark:bg-[#262C20] rounded w-1/4"></div>
                    <div className="h-4 bg-[#F4ECCF] dark:bg-[#262C20] rounded w-full"></div>
                    <div className="h-4 bg-[#F4ECCF] dark:bg-[#262C20] rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            ) : events.length === 0 ? (
              <div className="bg-[#FAF6E9] dark:bg-[#1F241A] border border-[#DDD2A8] dark:border-[#343B2A] rounded-md p-8 text-center space-y-3">
                <div className="w-9 h-9 mx-auto rounded border border-[#DDD2A8] dark:border-[#343B2A] bg-[#FCF9EF] dark:bg-[#252B1F] flex items-center justify-center text-[#6B7354] dark:text-[#9A947A]">
                  <LayersIcon size={18} />
                </div>
                <h3 className="text-sm font-semibold text-[#242918] dark:text-[#F1E8C7]">
                  No intelligence events clustered
                </h3>
                <p className="text-xs text-[#474F33] dark:text-[#D8CFB0] max-w-sm mx-auto">
                  The local database is either clean or awaiting the initial ingestion pipeline run.
                </p>
                <div className="pt-2">
                  <Button variant="primary" size="sm" onClick={() => navigate("/pipeline")}>
                    Open Pipeline Control
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((evt) => (
                  <div
                    key={evt.id}
                    onClick={() => navigate(`/events/${evt.id}`)}
                    className="bg-[#FAF6E9] dark:bg-[#1F241A] border border-[#DDD2A8] dark:border-[#343B2A] hover:border-[#9CA764] dark:hover:border-[#9CA764] rounded-md p-4 sm:p-5 shadow-[0_1px_2px_rgba(36,41,24,0.02)] transition-colors cursor-pointer group space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant={evt.category || "OTHER_MILITARY"}>
                          {evt.category || "OTHER_MILITARY"}
                        </Badge>
                        <span className="text-[11px] font-mono text-[#6B7354] dark:text-[#9A947A]">
                          {evt.article_count || 1}{" "}
                          {evt.article_count === 1 ? "source report" : "source reports"}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#6B7354] dark:text-[#9A947A] flex items-center space-x-1 font-mono">
                        <CalendarIcon size={12} />
                        <span>{formatDate(evt.latest_article_at || evt.first_article_at)}</span>
                      </div>
                    </div>

                    <p className="text-sm text-[#3D442C] dark:text-[#D8CFB0] leading-relaxed line-clamp-5 whitespace-pre-line">
                      {evt.summary || "No collective summary available."}
                    </p>

                    <div className="pt-2 border-t border-[#DDD2A8] dark:border-[#343B2A] flex items-center justify-between text-xs text-[#5C6448] dark:text-[#A39B7C]">
                      <span className="font-mono text-[11px] text-[#6B7354] dark:text-[#9A947A]">
                        ID: #{evt.id.slice(-6)}
                      </span>
                      <span className="text-[#7A8747] dark:text-[#9CA764] group-hover:text-[#68753A] dark:group-hover:text-[#B2BE7E] font-medium flex items-center space-x-1 text-xs transition-colors">
                        <span>Read Intelligence Report</span>
                        <ChevronRightIcon size={12} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar Column: Category Breakdown */}
          <div className="space-y-5">
            <div className="bg-[#FAF6E9] dark:bg-[#1F241A] border border-[#DDD2A8] dark:border-[#343B2A] rounded-md p-5 shadow-[0_1px_2px_rgba(36,41,24,0.02)] space-y-3.5">
              <h3 className="text-sm font-serif font-medium text-[#242918] dark:text-[#F1E8C7] pb-2 border-b border-[#DDD2A8] dark:border-[#343B2A]">
                Activity by Classification
              </h3>
              <div className="space-y-2">
                {[
                  { key: "ATTACK", label: "Direct Action / Attacks" },
                  { key: "DRILL", label: "Military Drills & Exercises" },
                  { key: "GEOPOLITICS", label: "Geopolitical Alignments" },
                  { key: "AGREEMENT", label: "Defense Pacts & Procurements" },
                  { key: "PEACE_DEAL", label: "Ceasefire & Negotiations" },
                  { key: "OTHER_MILITARY", label: "General Defense Developments" },
                ].map((cat) => {
                  const count = categoryCounts[cat.key] || 0;
                  return (
                    <div
                      key={cat.key}
                      onClick={() => navigate(`/events?category=${cat.key}`)}
                      className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-[#9CA764]/10 dark:hover:bg-[#9CA764]/15 transition-colors cursor-pointer text-xs"
                    >
                      <span className="text-[#3D442C] dark:text-[#D8CFB0]">{cat.label}</span>
                      <span className="font-mono font-medium px-2 py-0.5 rounded bg-[#F4ECCF] dark:bg-[#282F22] text-[#474F33] dark:text-[#D8CFB0] text-[11px]">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
