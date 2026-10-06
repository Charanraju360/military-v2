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
  MapIcon,
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
    <div className="min-h-screen bg-[#F7F5F0] text-[#25231F] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-7">
        {/* Executive Context Briefing Header */}
        <section className="bg-[#FFFFFF] border border-[#E6E2DA] rounded-md p-6 sm:p-7 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-4">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="space-y-1.5 max-w-3xl">
              <div className="flex items-center space-x-2 text-[11px] font-mono uppercase text-[#706D66]">
                <span>Intelligence Briefing</span>
                <span>/</span>
                <span>Operational Synthesis</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif font-medium tracking-tight text-[#25231F]">
                Military OSINT Intelligence Overview
              </h1>
              <p className="text-sm text-[#706D66] leading-relaxed pt-1">
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-[#F0EDE6]">
            <div className="space-y-0.5">
              <span className="text-[11px] font-mono uppercase text-[#858078]">
                Active Clustered Events
              </span>
              <div className="text-xl sm:text-2xl font-serif font-semibold text-[#25231F]">
                {events.length}
              </div>
              <span className="text-[11px] text-[#706D66]">
                synthesized from {totalArticles} reports
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-[11px] font-mono uppercase text-[#858078]">
                Monitored Feeds
              </span>
              <div className="text-xl sm:text-2xl font-serif font-semibold text-[#25231F]">
                {sources.filter((s) => s.active !== false).length}
              </div>
              <span className="text-[11px] text-[#706D66]">
                active defense OSINT sources
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-[11px] font-mono uppercase text-[#858078]">
                Lead Theatres
              </span>
              <div className="text-xl sm:text-2xl font-serif font-semibold text-[#25231F]">
                {Object.keys(categoryCounts).length || 0}
              </div>
              <span className="text-[11px] text-[#706D66]">
                event categories represented
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-[11px] font-mono uppercase text-[#858078]">
                Pipeline Readiness
              </span>
              <div className="text-xl sm:text-2xl font-serif font-semibold text-[#25231F] flex items-center gap-1.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    pipelineStatus?.running
                      ? "bg-[#C96A4A] animate-pulse"
                      : "bg-[#4A6B4E]"
                  }`}
                />
                <span>{pipelineStatus?.running ? "Ingesting" : "Operational"}</span>
              </div>
              <span className="text-[11px] text-[#706D66]">
                {pipelineStatus?.running
                  ? `Phase: ${pipelineStatus.current_phase}`
                  : "Database in sync"}
              </span>
            </div>
          </div>
        </section>

        {error && (
          <div className="bg-[#FDF2F2] border border-[#EFC7C7] rounded-md p-4 text-xs text-[#9B3838]">
            <span className="font-semibold">Data retrieval error:</span> {error}
          </div>
        )}

        {/* Two-Column Analytic Layout: Recent Events + Regional / Source Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Main Column: Recent Events Stream (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-[#E6E2DA]">
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-serif font-medium text-[#25231F]">
                  Recent Intelligence Events
                </h2>
                <span className="text-xs font-mono text-[#858078]">
                  ({events.length})
                </span>
              </div>
              <button
                type="button"
                onClick={() => navigate("/events")}
                className="text-xs text-[#C96A4A] hover:text-[#B85C3E] font-medium flex items-center space-x-1"
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
                    className="bg-[#FFFFFF] border border-[#E6E2DA] rounded-md p-5 h-32 animate-pulse space-y-2.5"
                  >
                    <div className="h-4 bg-[#F0EDE6] rounded w-1/4"></div>
                    <div className="h-4 bg-[#F0EDE6] rounded w-full"></div>
                    <div className="h-4 bg-[#F0EDE6] rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            ) : events.length === 0 ? (
              <div className="bg-[#FFFFFF] border border-[#E6E2DA] rounded-md p-8 text-center space-y-3">
                <div className="w-9 h-9 mx-auto rounded border border-[#E0D9CD] bg-[#F7F5F0] flex items-center justify-center text-[#858078]">
                  <LayersIcon size={18} />
                </div>
                <h3 className="text-sm font-semibold text-[#25231F]">
                  No intelligence events clustered
                </h3>
                <p className="text-xs text-[#706D66] max-w-sm mx-auto">
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
                    className="bg-[#FFFFFF] border border-[#E6E2DA] hover:border-[#D0C9BC] rounded-md p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-colors cursor-pointer group space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant={evt.category || "OTHER_MILITARY"}>
                          {evt.category || "OTHER_MILITARY"}
                        </Badge>
                        <span className="text-[11px] font-mono text-[#858078]">
                          {evt.article_count || 1}{" "}
                          {evt.article_count === 1 ? "source report" : "source reports"}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#858078] flex items-center space-x-1 font-mono">
                        <CalendarIcon size={12} />
                        <span>{formatDate(evt.latest_article_at || evt.first_article_at)}</span>
                      </div>
                    </div>

                    <p className="text-sm text-[#302E2A] leading-relaxed line-clamp-5 whitespace-pre-line">
                      {evt.summary || "No collective summary available."}
                    </p>

                    <div className="pt-2 border-t border-[#F0EDE6] flex items-center justify-between text-xs text-[#706D66]">
                      <span className="font-mono text-[11px] text-[#858078]">
                        ID: #{evt.id.slice(-6)}
                      </span>
                      <span className="text-[#C96A4A] group-hover:text-[#B85C3E] font-medium flex items-center space-x-1 text-xs">
                        <span>Read Intelligence Report</span>
                        <ChevronRightIcon size={12} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar Column: Category & Source Breakdown + Fast Actions */}
          <div className="space-y-5">
            {/* Thematic Categories */}
            <div className="bg-[#FFFFFF] border border-[#E6E2DA] rounded-md p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-3.5">
              <h3 className="text-sm font-serif font-medium text-[#25231F] pb-2 border-b border-[#F0EDE6]">
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
                      className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-[#F7F5F0] transition-colors cursor-pointer text-xs"
                    >
                      <span className="text-[#47423B]">{cat.label}</span>
                      <span className="font-mono font-medium px-2 py-0.5 rounded bg-[#F0EDE6] text-[#5C574F] text-[11px]">
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
