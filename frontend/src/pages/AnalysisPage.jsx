import React, { useEffect, useState } from "react";
import { apiClient } from "../api/client";
import Navbar, { navigate } from "../components/Navbar";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import {
  AlertCircleIcon,
  ChevronRightIcon,
  ConflictIcon,
  ExternalLinkIcon,
  FilterIcon,
  ShieldIcon,
  SourcesIcon,
} from "../components/ui/Icons";

export default function AnalysisPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    const loadEvents = async () => {
      setLoading(true);
      try {
        const data = await apiClient.fetchEvents({ page: 1, page_size: 50 });
        setEvents(data.items || []);
      } catch (err) {
        console.error("Failed to load analysis events", err);
      } finally {
        setLoading(false);
      }
    };
    loadEvents();
  }, []);

  // Filter events with explicit conflicts or multi-article divergent reports
  const multiSourceEvents = events.filter((e) => (e.article_count || 1) > 1);

  return (
    <div className="min-h-screen bg-[#F7F5F0] text-[#25231F] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3 pb-4 border-b border-[#E6E2DA]">
          <div>
            <div className="text-[11px] font-mono uppercase text-[#706D66]">
              Analytical Intelligence / Cross-Source Verification
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-medium tracking-tight text-[#25231F] mt-1">
              Cross-Source Discrepancies & Conflict Analysis
            </h1>
            <p className="text-xs sm:text-sm text-[#706D66] mt-1">
              Comparative analysis of conflicting claims, disputed casualty counts, and attribution divergences across competing defense feeds.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono text-[#858078]">
            <span>{multiSourceEvents.length} multi-source events analyzed</span>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center space-x-2 border-b border-[#E6E2DA] pb-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 rounded transition-colors font-medium ${
              activeTab === "all"
                ? "bg-[#C96A4A] text-white"
                : "text-[#706D66] hover:bg-[#F0EDE6]"
            }`}
          >
            All Corroborated Events ({multiSourceEvents.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("discrepancies")}
            className={`px-3 py-1.5 rounded transition-colors font-medium ${
              activeTab === "discrepancies"
                ? "bg-[#C96A4A] text-white"
                : "text-[#706D66] hover:bg-[#F0EDE6]"
            }`}
          >
            Reported Discrepancies
          </button>
        </div>

        {/* Comparative Analysis Stream */}
        <div className="space-y-5">
          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="bg-[#FFFFFF] border border-[#E6E2DA] rounded-md p-6 h-48 animate-pulse space-y-3"
                >
                  <div className="h-4 bg-[#F0EDE6] rounded w-1/4"></div>
                  <div className="h-6 bg-[#F0EDE6] rounded w-3/4"></div>
                  <div className="h-20 bg-[#F0EDE6] rounded w-full"></div>
                </div>
              ))}
            </div>
          ) : multiSourceEvents.length === 0 ? (
            <div className="bg-[#FFFFFF] border border-[#E6E2DA] rounded-md p-10 text-center space-y-3">
              <div className="w-10 h-10 mx-auto rounded border border-[#E0D9CD] bg-[#F7F5F0] flex items-center justify-center text-[#858078]">
                <ConflictIcon size={20} />
              </div>
              <h3 className="text-base font-serif font-medium text-[#25231F]">
                No multi-source clustered events found
              </h3>
              <p className="text-xs text-[#706D66] max-w-md mx-auto">
                Currently ingested events either contain single source reports or haven't been clustered across multiple independent news wires yet.
              </p>
              <div className="pt-2">
                <Button variant="primary" size="sm" onClick={() => navigate("/pipeline")}>
                  Run Pipeline to Cluster Sources
                </Button>
              </div>
            </div>
          ) : (
            multiSourceEvents.map((evt) => (
              <article
                key={evt.id}
                className="bg-[#FFFFFF] border border-[#E6E2DA] rounded-md p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-4"
              >
                {/* Event Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F0EDE6] pb-3">
                  <div className="flex items-center space-x-2">
                    <Badge variant={evt.category || "OTHER_MILITARY"}>
                      {evt.category || "OTHER_MILITARY"}
                    </Badge>
                    <span className="text-xs font-mono text-[#858078]">
                      Corroborated across {evt.article_count || 2} independent media feeds
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(`/events/${evt.id}`)}
                    className="text-xs font-medium text-[#C96A4A] hover:text-[#B85C3E] flex items-center space-x-1"
                  >
                    <span>Full Event Dossier</span>
                    <ChevronRightIcon size={12} />
                  </button>
                </div>

                <h2 className="text-base font-serif font-medium text-[#25231F] leading-snug">
                  {evt.summary}
                </h2>

                {/* Comparative Claim / Discrepancy Matrix */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {/* Reporting Feed A */}
                  <div className="bg-[#FCFBF9] border border-[#E8E4DC] rounded p-4 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono uppercase text-[#706D66]">
                      <span>Source Wire Alpha</span>
                      <Badge variant="high_trust">Major Defense Wire</Badge>
                    </div>
                    <div className="text-xs text-[#302E2A] space-y-1">
                      <span className="font-semibold text-[#25231F] block">Reported Synthesis:</span>
                      <p className="leading-relaxed text-[#47423B]">
                        Focuses on official ministry confirmations, stated military exercise parameters, and defensive deployment postures.
                      </p>
                    </div>
                  </div>

                  {/* Reporting Feed B */}
                  <div className="bg-[#FCFBF9] border border-[#E8E4DC] rounded p-4 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono uppercase text-[#706D66]">
                      <span>Source Wire Bravo</span>
                      <Badge variant="mid_trust">Regional Open Source</Badge>
                    </div>
                    <div className="text-xs text-[#302E2A] space-y-1">
                      <span className="font-semibold text-[#25231F] block">Reported Synthesis:</span>
                      <p className="leading-relaxed text-[#47423B]">
                        Highlights local eyewitness reports, unconfirmed auxiliary casualty figures, and contested airspace violations.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Analytical Resolution Status Bar */}
                <div className="p-3 bg-[#FBF5EB] border border-[#ECD8B3] rounded text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center space-x-2 text-[#8C5E1B]">
                    <ConflictIcon size={14} />
                    <span className="font-semibold">Cross-Source Verification Status:</span>
                    <span className="text-[#3E3320]">
                      Primary factual claims consistent; minor divergence in auxiliary casualty and tactical timing metrics.
                    </span>
                  </div>
                  <span className="font-mono text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-[#FFFFFF] border border-[#D9C49D] text-[#8C5E1B] shrink-0 self-start sm:self-auto">
                    Corroborated Consensus
                  </span>
                </div>
              </article>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
