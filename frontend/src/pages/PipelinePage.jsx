import React, { useEffect, useRef, useState } from "react";
import { apiClient } from "../api/client";
import Navbar, { navigate } from "../components/Navbar";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Modal from "../components/ui/Modal";
import {
  AlertCircleIcon,
  CheckIcon,
  ChevronRightIcon,
  PipelineIcon,
  RefreshIcon,
  ShieldIcon,
  TrashIcon,
} from "../components/ui/Icons";

export default function PipelinePage() {
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Confirmation Modals
  const [showRunConfirm, setShowRunConfirm] = useState(false);
  const [showCleanConfirm, setShowCleanConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Expanded log IDs in history
  const [expandedLogId, setExpandedLogId] = useState(null);

  const pollTimerRef = useRef(null);
  const wasRunningRef = useRef(false);

  const loadStatusAndLogs = async () => {
    try {
      const statusData = await apiClient.fetchPipelineStatus();
      setStatus(statusData);

      const logsData = await apiClient.fetchPipelineLogs();
      setLogs(logsData.items || []);
    } catch (err) {
      setError(err.message || "Failed to load pipeline diagnostic state.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatusAndLogs();

    pollTimerRef.current = setInterval(async () => {
      try {
        const s = await apiClient.fetchPipelineStatus();
        setStatus(s);
        if (wasRunningRef.current && !s.running) {
          const logsData = await apiClient.fetchPipelineLogs();
          setLogs(logsData.items || []);
        }
        wasRunningRef.current = !!s?.running;
      } catch (_) {}
    }, 2000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  const handleRunPipeline = async () => {
    setShowRunConfirm(false);
    setActionLoading(true);
    setError(null);
    try {
      await apiClient.runPipeline();
      await loadStatusAndLogs();
    } catch (err) {
      setError(err.message || "Failed to initiate pipeline execution.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCleanDatabase = async () => {
    setShowCleanConfirm(false);
    setActionLoading(true);
    setError(null);
    try {
      await apiClient.cleanDatabase();
      await loadStatusAndLogs();
    } catch (err) {
      setError(err.message || "Failed to wipe database collections.");
    } finally {
      setActionLoading(false);
    }
  };

  const isRunning = status?.running;

  const phaseNames = [
    { id: "clean_db", label: "1. Database Wipe", desc: "Wipes volatile collections" },
    { id: "collect", label: "2. News Ingestion", desc: "Fetches RSS/API feeds" },
    { id: "clean", label: "3. Text Cleaning", desc: "HTML stripping & boilerplate" },
    { id: "filter", label: "4. Military Topic Filter", desc: "Enforces defense taxonomy" },
    { id: "embed", label: "5. Vector Embedding", desc: "Batched dense embeddings" },
    { id: "cluster", label: "6. Hybrid Clustering", desc: "Semantic/Entity/Time clustering" },
    { id: "summarize", label: "7. Event Synthesis", desc: "Qwen3-14B multi-source summary" },
  ];

  return (
    <div className="min-h-screen bg-[#F7F5F0] text-[#25231F] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-7">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4 pb-4 border-b border-[#E6E2DA]">
          <div>
            <div className="text-[11px] font-mono uppercase text-[#706D66]">
              Operational Diagnostics / Ingestion Pipeline
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-medium tracking-tight text-[#25231F] mt-1">
              Pipeline Control & Telemetry
            </h1>
            <p className="text-xs sm:text-sm text-[#706D66] mt-1">
              Manual pipeline trigger, database state management, and real-time execution telemetry across all processing stages.
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              disabled={isRunning || actionLoading}
              onClick={() => setShowCleanConfirm(true)}
            >
              <TrashIcon size={12} className="text-[#9B3838]" />
              <span>Clean Database</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={isRunning || actionLoading}
              onClick={() => setShowRunConfirm(true)}
            >
              <PipelineIcon size={13} />
              <span>Execute Pipeline Run</span>
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-[#FDF2F2] border border-[#EFC7C7] rounded-md p-4 text-xs text-[#9B3838] space-y-1">
            <span className="font-semibold">Operational Error:</span> {error}
          </div>
        )}

        {/* Live Status Section */}
        <section className="bg-[#FFFFFF] border border-[#E6E2DA] rounded-md p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0EDE6] pb-3">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono uppercase text-[#706D66]">
                Telemetry Monitor
              </span>
              <span>·</span>
              <span className="text-sm font-semibold text-[#25231F]">
                {isRunning ? (
                  <span className="text-[#C96A4A] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#C96A4A] animate-pulse" />
                    Executing Run ({status?.current_phase || "initializing"} stage)
                  </span>
                ) : (
                  <span className="text-[#4A6B4E] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#4A6B4E]" />
                    Pipeline Idle / Ready for Execution
                  </span>
                )}
              </span>
            </div>

            {status?.current_run_id && (
              <span className="text-[11px] font-mono text-[#858078]">
                ACTIVE RUN ID: {status.current_run_id}
              </span>
            )}
          </div>

          {/* Phase Progress Sequence Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2.5">
            {phaseNames.map((phase) => {
              const emittedPhases = status?.phases_so_far || [];
              const phaseData = emittedPhases.find((p) => p.phase === phase.id);
              const isCurrent = status?.current_phase === phase.id && isRunning;
              const isDone = Boolean(
                phaseData &&
                  (phaseData.status === "done" ||
                    phaseData.status === "done_with_errors")
              );
              const isFailed = Boolean(phaseData && phaseData.status === "failed");

              return (
                <div
                  key={phase.id}
                  className={`rounded border p-3 text-xs space-y-2 transition-all ${
                    isCurrent
                      ? "bg-[#FBF1ED] dark:bg-[#341F18] border-[#ECCDC1] dark:border-[#D97757] ring-1 ring-[#C96A4A]/40 dark:ring-[#D97757]/60"
                      : isFailed
                      ? "bg-[#FDF2F2] dark:bg-[#2E1818] border-[#EFC7C7] dark:border-[#522525]"
                      : isDone
                      ? "bg-[#FCFBF9] dark:bg-[#1E241E] border-[#DEDAD2] dark:border-[#2A3E2C]"
                      : "bg-[#F7F5F0] dark:bg-[#1C1B18] border-[#E8E4DC] dark:border-[#2C2A25] opacity-70"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase font-semibold text-[#706D66] dark:text-[#A8A297]">
                      {phase.id}
                    </span>
                    {isCurrent ? (
                      <span className="text-[10px] font-mono text-[#C96A4A] dark:text-[#FF8A65] font-semibold animate-pulse">
                        RUNNING
                      </span>
                    ) : isDone ? (
                      <span className="text-[10px] font-mono text-[#4A6B4E] dark:text-[#81C784] font-semibold">
                        DONE
                      </span>
                    ) : isFailed ? (
                      <span className="text-[10px] font-mono text-[#9B3838] dark:text-[#E57373] font-semibold">
                        FAILED
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-[#8F8A80] dark:text-[#7A756B]">
                        PENDING
                      </span>
                    )}
                  </div>

                  <p className={`text-[11px] font-medium leading-tight ${
                    isCurrent
                      ? "text-[#25231F] dark:text-[#FFEBE0]"
                      : "text-[#25231F] dark:text-[#EDE8DF]"
                  }`}>
                    {phase.desc}
                  </p>

                  {/* Phase Metrics */}
                  {phaseData && (
                    <div className="pt-1.5 border-t border-[#E8E4DC] font-mono text-[10px] text-[#5C574F] space-y-0.5">
                      {phase.id === "clean_db" && <p>Wiped stores</p>}
                      {phase.id === "collect" && (
                        <p>+{phaseData.new || 0} / dupe:{phaseData.skipped_dupes || 0}</p>
                      )}
                      {phase.id === "clean" && (
                        <p>ok:{phaseData.cleaned || 0} / rej:{phaseData.rejected_short || 0}</p>
                      )}
                      {phase.id === "filter" && (
                        <p>ok:{phaseData.filtered_ok || 0} / off:{phaseData.rejected_offtopic || 0}</p>
                      )}
                      {phase.id === "embed" && (
                        <p>vec:{phaseData.processed || 0} / err:{phaseData.failed || 0}</p>
                      )}
                      {phase.id === "cluster" && (
                        <p>evt:{phaseData.events_created || 0} / sgl:{phaseData.singleton_events || 0}</p>
                      )}
                      {phase.id === "summarize" && (
                        <p>sum:{phaseData.summarized || 0} / fbk:{phaseData.fallback_used || 0}</p>
                      )}

                      {phaseData.errors && phaseData.errors.length > 0 && (
                        <p className="text-[#9B3838] font-sans">
                          {phaseData.errors.length} error(s)
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Historical Pipeline Logs Section */}
        <section className="bg-[#FFFFFF] border border-[#E6E2DA] rounded-md p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F0EDE6]">
            <div>
              <h2 className="text-base font-serif font-medium text-[#25231F]">
                Historical Run Telemetry Logs
              </h2>
              <p className="text-xs text-[#706D66]">
                Immutable execution records persisted to MongoDB pipeline_logs collection.
              </p>
            </div>
            <span className="text-xs font-mono text-[#858078]">
              {logs.length} logged run(s)
            </span>
          </div>

          {logs.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#706D66]">
              No previous pipeline runs recorded.
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => {
                const isExpanded = expandedLogId === log.run_id;
                const isSuccess = log.overall_status === "completed";

                return (
                  <div
                    key={log.run_id}
                    className="border border-[#E6E2DA] rounded p-4 space-y-3 bg-[#FCFBF9]"
                  >
                    <div
                      className="flex flex-wrap items-center justify-between gap-2 cursor-pointer select-none"
                      onClick={() =>
                        setExpandedLogId(isExpanded ? null : log.run_id)
                      }
                    >
                      <div className="flex items-center space-x-3 text-xs">
                        <Badge variant={isSuccess ? "high_trust" : "low_trust"}>
                          {log.overall_status?.toUpperCase() || "UNKNOWN"}
                        </Badge>
                        <span className="font-mono text-[#25231F]">
                          Run #{log.run_id.slice(-8)}
                        </span>
                        <span className="text-[#706D66]">
                          Started: {new Date(log.started_at).toLocaleString()}
                        </span>
                      </div>

                      <span className="text-xs font-medium text-[#C96A4A] hover:text-[#B85C3E]">
                        {isExpanded ? "Hide JSON Diagnostics ▲" : "View Phase Diagnostics ▼"}
                      </span>
                    </div>

                    {isExpanded && (
                      <div className="pt-3 border-t border-[#EBE7DF] space-y-2">
                        <h4 className="text-[11px] font-mono uppercase text-[#706D66]">
                          Phase Breakdown Trace
                        </h4>
                        <div className="bg-[#F7F5F0] p-3 rounded border border-[#E6E2DA] font-mono text-[11px] space-y-1.5 max-h-60 overflow-y-auto">
                          {log.phases && log.phases.length > 0 ? (
                            log.phases.map((p, idx) => (
                              <div
                                key={idx}
                                className="border-b border-[#E8E4DC] pb-1 text-[#302E2A]"
                              >
                                <span className="text-[#C96A4A] font-semibold">
                                  [{p.phase}]
                                </span>{" "}
                                status={p.status}{" "}
                                {JSON.stringify(p)}
                              </div>
                            ))
                          ) : (
                            <span className="text-[#858078]">
                              No detailed phase telemetry emitted for this run.
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Confirmation Modal — Run Pipeline */}
        <Modal
          open={showRunConfirm}
          onClose={() => setShowRunConfirm(false)}
          title="Confirm Pipeline Ingestion Run"
        >
          <div className="space-y-4 pt-1">
            <p className="text-xs text-[#47423B] leading-relaxed">
              Executing the pipeline wipes the database first (excluding configured intelligence sources), collects fresh articles from active feeds, applies the military topic filter, computes vector embeddings, clusters events, and generates collective summaries.
            </p>
            <div className="p-3 bg-[#FBF5EB] border border-[#ECD8B3] rounded text-xs text-[#8C5E1B]">
              <span className="font-semibold">Notice:</span> Existing articles, clustered events, and chat sessions will be refreshed. News source configurations remain permanently preserved.
            </div>
            <div className="flex justify-end space-x-2 pt-2 border-t border-[#F0EDE6]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRunConfirm(false)}
              >
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleRunPipeline}>
                Proceed with Run
              </Button>
            </div>
          </div>
        </Modal>

        {/* Confirmation Modal — Clean Database */}
        <Modal
          open={showCleanConfirm}
          onClose={() => setShowCleanConfirm(false)}
          title="Confirm Database Wipe"
        >
          <div className="space-y-4 pt-1">
            <p className="text-xs text-[#47423B] leading-relaxed">
              Cleaning the database permanently purges all ingested articles, extracted entities, clustered events, vector stores, and assistant threads. Configured intelligence sources are preserved.
            </p>
            <div className="p-3 bg-[#FDF2F2] border border-[#EFC7C7] rounded text-xs text-[#9B3838]">
              <span className="font-semibold">Destructive Action:</span> Clustered intelligence data cannot be recovered once purged.
            </div>
            <div className="flex justify-end space-x-2 pt-2 border-t border-[#F0EDE6]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCleanConfirm(false)}
              >
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={handleCleanDatabase}>
                Confirm Clean DB
              </Button>
            </div>
          </div>
        </Modal>
      </main>
    </div>
  );
}
