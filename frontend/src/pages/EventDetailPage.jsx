import React, { useEffect, useState } from "react";
import { apiClient } from "../api/client";
import Navbar, { navigate } from "../components/Navbar";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Table from "../components/ui/Table";
import {
  AlertCircleIcon,
  ArrowRightIcon,
  AssistantIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ConflictIcon,
  ExternalLinkIcon,
  LocationIcon,
  ShieldIcon,
  SourcesIcon,
} from "../components/ui/Icons";

export default function EventDetailPage() {
  const eventId = window.location.pathname
    .replace(/^\/events\/?/, "")
    .split("/")[0]
    .split("?")[0];

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
        setError(err.message || "Failed to load event intelligence report.");
      } finally {
        setLoading(false);
      }
    };
    loadDetail();
  }, [eventId]);

  const formatDate = (isoString) => {
    if (!isoString) return "N/A";
    try {
      return new Date(isoString).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (_) {
      return isoString;
    }
  };

  const getSourceModelLabel = (source) => {
    switch (source) {
      case "qwen_primary":
        return "Synthesized via Qwen3-14B (Primary)";
      case "openrouter_secondary":
        return "Synthesized via OpenRouter (Secondary Fallback)";
      case "structured_fallback":
        return "Structured Extraction (Deterministic Fallback)";
      default:
        return "Multi-Source Extraction";
    }
  };

  return (
    <div className="min-h-screen bg-[#F1E8C7] dark:bg-[#161912] text-[#242918] dark:text-[#F1E8C7] flex flex-col font-sans transition-colors">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-7">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate("/events")}
            className="inline-flex items-center space-x-1.5 text-xs font-medium text-[#5C6448] dark:text-[#A39B7C] hover:text-[#242918] dark:hover:text-[#F1E8C7] transition-colors"
          >
            <ChevronLeftIcon size={12} />
            <span>Return to Event Feed</span>
          </button>

          <span className="text-[11px] font-mono text-[#6B7354] dark:text-[#9A947A]">
            EVENT ID: {eventId}
          </span>
        </div>

        {loading ? (
          <div className="bg-[#FAF6E9] dark:bg-[#1F241A] border border-[#DDD2A8] dark:border-[#343B2A] rounded-md p-8 animate-pulse space-y-4">
            <div className="h-5 bg-[#F4ECCF] dark:bg-[#262C20] rounded w-1/4"></div>
            <div className="h-8 bg-[#F4ECCF] dark:bg-[#262C20] rounded w-3/4"></div>
            <div className="h-24 bg-[#F4ECCF] dark:bg-[#262C20] rounded w-full"></div>
          </div>
        ) : error ? (
          <div className="bg-[#F7EBE8] dark:bg-[#2B1B19] border border-[#E8C7C1] dark:border-[#4E2B27] rounded-md p-6 text-[#8C3A35] dark:text-[#E58079] space-y-2">
            <h3 className="font-serif font-medium text-base">
              Unable to load intelligence report
            </h3>
            <p className="text-xs">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/events")}
              className="mt-2"
            >
              Back to Events
            </Button>
          </div>
        ) : !event ? (
          <div className="bg-[#FAF6E9] dark:bg-[#1F241A] border border-[#DDD2A8] dark:border-[#343B2A] rounded-md p-8 text-center text-[#6B7354] dark:text-[#9A947A]">
            Intelligence event record not found.
          </div>
        ) : (
          <article className="space-y-7">
            {/* Header Document Section */}
            <header className="bg-[#FAF6E9] dark:bg-[#1F241A] border border-[#DDD2A8] dark:border-[#343B2A] rounded-md p-6 sm:p-7 shadow-[0_1px_2px_rgba(36,41,24,0.03)] space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#DDD2A8] dark:border-[#343B2A] pb-3">
                <div className="flex items-center space-x-2">
                  <Badge variant={event.category || "OTHER_MILITARY"}>
                    {event.category || "OTHER_MILITARY"}
                  </Badge>
                  <Badge variant={event.summary_source || "structured_fallback"}>
                    {getSourceModelLabel(event.summary_source)}
                  </Badge>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    navigate(
                      `/assistant?prompt=${encodeURIComponent(
                        `Explain and evaluate the claims regarding event #${event.id.slice(-6)}: ${event.summary ? event.summary.slice(0, 100) : ""}`
                      )}`
                    )
                  }
                >
                  <AssistantIcon size={13} />
                  <span>Investigate in Assistant</span>
                </Button>
              </div>

              <div className="space-y-1.5">
                <div className="text-[11px] font-mono uppercase text-[#6B7354] dark:text-[#9A947A]">
                  Intelligence Brief / Multi-Source Collective Synthesis
                </div>
                <h1 className="text-xl sm:text-2xl font-serif font-medium text-[#242918] dark:text-[#F1E8C7] leading-snug">
                  {event.summary && event.summary.length > 100
                    ? event.summary.slice(0, 100).replace(/\s+[^\s]*$/, "") + "..."
                    : event.summary || `Intelligence Event #${event.id.slice(-6)}`}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[#6B7354] dark:text-[#9A947A] pt-1">
                  <span>
                    Reported Window: {formatDate(event.first_article_at || event.latest_article_at)}
                    {event.latest_article_at !== event.first_article_at &&
                      ` — ${formatDate(event.latest_article_at)}`}
                  </span>
                  <span>·</span>
                  <span>
                    Attribution: {event.articles?.length || event.article_count || 1} source article(s)
                  </span>
                </div>
              </div>
            </header>

            {/* Executive Summary Section */}
            <section className="bg-[#FAF6E9] dark:bg-[#1F241A] border border-[#DDD2A8] dark:border-[#343B2A] rounded-md p-6 shadow-[0_1px_2px_rgba(36,41,24,0.02)] space-y-3">
              <h2 className="text-xs font-mono uppercase tracking-wider text-[#6B7354] dark:text-[#9A947A]">
                Executive Summary
              </h2>
              <div className="bg-[#FCF9EF] dark:bg-[#191E15] border border-[#DDD2A8] dark:border-[#38412F] rounded p-4 sm:p-5">
                <p className="text-sm sm:text-base text-[#242918] dark:text-[#F1E8C7] font-serif leading-relaxed whitespace-pre-line">
                  {event.summary || "No collective summary available."}
                </p>
              </div>
            </section>

            {/* Extracted Key Claims & Evidence Section */}
            {event.claims && event.claims.length > 0 && (
              <section className="bg-[#FAF6E9] dark:bg-[#1F241A] border border-[#DDD2A8] dark:border-[#343B2A] rounded-md p-6 shadow-[0_1px_2px_rgba(36,41,24,0.02)] space-y-3">
                <h2 className="text-xs font-mono uppercase tracking-wider text-[#6B7354] dark:text-[#9A947A]">
                  Key Claims & Evidence Trail
                </h2>
                <div className="space-y-2">
                  {event.claims.map((claim, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-[#FCF9EF] dark:bg-[#191E15] border border-[#DDD2A8] dark:border-[#38412F] rounded text-xs space-y-1"
                    >
                      <p className="text-[#3D442C] dark:text-[#D8CFB0] font-medium leading-relaxed">
                        • {claim.text || claim}
                      </p>
                      {claim.article_ids && claim.article_ids.length > 0 && (
                        <p className="text-[11px] font-mono text-[#6B7354] dark:text-[#9A947A]">
                          Attributed to {claim.article_ids.length} member report(s)
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Event Timeline */}
            <section className="bg-[#FAF6E9] dark:bg-[#1F241A] border border-[#DDD2A8] dark:border-[#343B2A] rounded-md p-6 shadow-[0_1px_2px_rgba(36,41,24,0.02)] space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#DDD2A8] dark:border-[#343B2A]">
                <h2 className="text-xs font-mono uppercase tracking-wider text-[#6B7354] dark:text-[#9A947A]">
                  Chronological Event Timeline
                </h2>
                <span className="text-[11px] font-mono text-[#6B7354] dark:text-[#9A947A]">
                  Ordered by incident report time
                </span>
              </div>

              {event.timeline && event.timeline.length > 0 ? (
                <div className="relative border-l border-[#DDD2A8] dark:border-[#38412F] ml-3 pl-4 space-y-4 py-1">
                  {event.timeline.map((item, idx) => (
                    <div key={idx} className="relative space-y-1">
                      <div className="absolute -left-[21px] top-1 w-2 h-2 rounded-full bg-[#9CA764] border-2 border-[#FAF6E9] dark:border-[#1F241A]" />
                      <div className="text-[11px] font-mono text-[#6B7354] dark:text-[#9A947A]">
                        {formatDate(item.date || item.timestamp || item.time)}
                      </div>
                      <p className="text-xs sm:text-sm text-[#3D442C] dark:text-[#D8CFB0] leading-relaxed">
                        {item.description || item.text}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-[#5C6448] dark:text-[#A39B7C] py-2">
                  No chronological breakdown recorded for this event. Reporting timeframe spans {formatDate(event.first_article_at || event.latest_article_at)}.
                </div>
              )}
            </section>

            {/* Cross-Source Conflict & Discrepancy Detection */}
            {event.conflicts && event.conflicts.length > 0 && (
              <section className="bg-[#FAF6E9] dark:bg-[#1F241A] border border-[#DDD2A8] dark:border-[#343B2A] rounded-md p-6 shadow-[0_1px_2px_rgba(36,41,24,0.02)] space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#DDD2A8] dark:border-[#343B2A]">
                  <h2 className="text-xs font-mono uppercase tracking-wider text-[#6B7354] dark:text-[#9A947A]">
                    Cross-Source Analysis & Conflict Evaluation
                  </h2>
                  <span className="text-[11px] font-mono text-[#6B7354] dark:text-[#9A947A]">
                    Comparative verification
                  </span>
                </div>

                <div className="space-y-3">
                  {event.conflicts.map((conf, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-[#F4EED8] dark:bg-[#2A2415] border border-[#DFD3A7] dark:border-[#4B3E21] rounded-md space-y-2 text-xs"
                    >
                      <div className="flex items-center space-x-1.5 font-semibold text-[#7C6321] dark:text-[#E2BD68]">
                        <ConflictIcon size={14} />
                        <span>Source Discrepancy Identified</span>
                      </div>
                      <p className="text-[#3D442C] dark:text-[#D8CFB0] leading-relaxed">
                        {conf.text || conf.description || JSON.stringify(conf)}
                      </p>
                      {conf.status && (
                        <span className="inline-block font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-[#FAF6E9] dark:bg-[#1F241A] border border-[#DDD2A8] dark:border-[#38412F] text-[#7C6321] dark:text-[#E2BD68]">
                          Status: {conf.status}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Extracted Entities Dossier */}
            {event.entities && event.entities.length > 0 && (
              <section className="bg-[#FAF6E9] dark:bg-[#1F241A] border border-[#DDD2A8] dark:border-[#343B2A] rounded-md p-6 shadow-[0_1px_2px_rgba(36,41,24,0.02)] space-y-3">
                <h2 className="text-xs font-mono uppercase tracking-wider text-[#6B7354] dark:text-[#9A947A]">
                  Extracted Military & Political Entities ({event.entities.length})
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {event.entities.map((ent, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-2.5 py-1 rounded text-xs bg-[#FCF9EF] dark:bg-[#191E15] border border-[#DDD2A8] dark:border-[#38412F] text-[#242918] dark:text-[#F1E8C7]"
                    >
                      <span className="text-[#6B7354] dark:text-[#9A947A] mr-1.5 font-mono text-[10px] uppercase">
                        {ent.type}
                      </span>
                      <span className="font-medium">{ent.text}</span>
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Member Articles Attribution Dossier */}
            <section className="bg-[#FAF6E9] dark:bg-[#1F241A] border border-[#DDD2A8] dark:border-[#343B2A] rounded-md p-6 shadow-[0_1px_2px_rgba(36,41,24,0.02)] space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#DDD2A8] dark:border-[#343B2A]">
                <h2 className="text-xs font-mono uppercase tracking-wider text-[#6B7354] dark:text-[#9A947A]">
                  Member Ingested Articles ({event.articles?.length || 0})
                </h2>
                <span className="text-[11px] font-mono text-[#6B7354] dark:text-[#9A947A]">
                  Verified sources
                </span>
              </div>

              <Table>
                <thead>
                  <tr className="border-b border-[#DDD2A8] dark:border-[#343B2A] bg-[#F4ECCF] dark:bg-[#262C20] text-[#5C6448] dark:text-[#A39B7C] font-mono text-[11px] uppercase">
                    <th className="p-3">Report Title</th>
                    <th className="p-3">Source Provider</th>
                    <th className="p-3">Publication Date</th>
                    <th className="p-3 text-right">External Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DDD2A8] dark:divide-[#343B2A]">
                  {event.articles && event.articles.length > 0 ? (
                    event.articles.map((art) => (
                      <tr
                        key={art.id}
                        className="hover:bg-[#FCF9EF] dark:hover:bg-[#252B1F] transition-colors"
                      >
                        <td className="p-3 font-medium text-[#242918] dark:text-[#F1E8C7] max-w-sm">
                          {art.title}
                        </td>
                        <td className="p-3 text-[#5C6448] dark:text-[#A39B7C] font-mono text-xs">
                          {art.source || "OSINT Feed"}
                        </td>
                        <td className="p-3 text-[#5C6448] dark:text-[#A39B7C] font-mono text-xs">
                          {formatDate(art.published_at)}
                        </td>
                        <td className="p-3 text-right">
                          <a
                            href={art.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 text-xs font-medium text-[#7A8747] dark:text-[#9CA764] hover:text-[#68753A] dark:hover:text-[#B2BE7E] transition-colors"
                          >
                            <span>Inspect</span>
                            <ExternalLinkIcon size={12} />
                          </a>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-[#6B7354] dark:text-[#9A947A] text-xs">
                        No articles attached to this event record.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </section>
          </article>
        )}
      </main>
    </div>
  );
}
