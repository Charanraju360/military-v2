import React, { useEffect, useRef, useState } from "react";
import { apiClient } from "../api/client";

import Navbar, { navigate } from "../components/Navbar";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Modal from "../components/ui/Modal";

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

  const loadStatusAndLogs = async () => {
    try {
      const statusData = await apiClient.fetchPipelineStatus();
      setStatus(statusData);

      const logsData = await apiClient.fetchPipelineLogs();
      setLogs(logsData.items || []);
    } catch (err) {
      setError(err.message || "Failed to load pipeline state.");
    } finally {
      setLoading(false);
    }
  };

  const wasRunningRef = useRef(false);

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
      setError(err.message || "Failed to start pipeline run.");
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
      alert("Database cleaned successfully. Sources and pipeline status retained.");
    } catch (err) {
      setError(err.message || "Failed to clean database.");
    } finally {
      setActionLoading(false);
    }
  };

  const isRunning = status?.running;

  const phaseNames = ["clean_db", "collect", "clean", "filter", "embed", "cluster", "summarize"];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <h1 className="text-2xl font-extrabold text-white">Pipeline Control & Status</h1>
            <p className="text-sm text-slate-400 mt-1">
              Trigger intelligence ingestion runs, wipe data, and monitor live phase status.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant="danger"
              disabled={isRunning || actionLoading}
              onClick={() => setShowCleanConfirm(true)}
            >
              🧹 Clean Database
            </Button>
            <Button
              variant="primary"
              disabled={isRunning || actionLoading}
              onClick={() => setShowRunConfirm(true)}
            >
              🚀 Run Pipeline
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-950/60 border border-red-800 text-red-300 p-4 rounded-xl text-sm">
            <p className="font-bold">Pipeline Error</p>
            <p className="mt-0.5">{error}</p>
          </div>
        )}

        {/* Live Status Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>📡</span> Live Run Status
            </h2>
            <div className="flex items-center space-x-2">
              {isRunning ? (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-400 border border-amber-800/60 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  Run In Progress ({status?.current_phase || "initializing"})
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  Idle (Ready)
                </span>
              )}
            </div>
          </div>

          {/* Phase Progress Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {phaseNames.map((pName) => {
              const emittedPhases = status?.phases_so_far || [];
              const phaseData = emittedPhases.find((p) => p.phase === pName);
              const isCurrent = status?.current_phase === pName && isRunning;
              const isDone = Boolean(phaseData && (phaseData.status === "done" || phaseData.status === "done_with_errors"));
              const isFailed = Boolean(phaseData && phaseData.status === "failed");

              return (
                <div
                  key={pName}
                  className={`border rounded-lg p-3 space-y-2 transition-all ${
                    isCurrent
                      ? "bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500"
                      : isFailed
                      ? "bg-red-950/30 border-red-800"
                      : isDone
                      ? "bg-slate-800/60 border-slate-700"
                      : "bg-slate-950/40 border-slate-800/60 opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold uppercase">
                    <span className={isCurrent ? "text-indigo-300" : "text-slate-300"}>
                      {pName.replace("_", " ")}
                    </span>
                    {isCurrent ? (
                      <span className="text-indigo-400 animate-pulse">Running...</span>
                    ) : isDone ? (
                      <span className="text-emerald-400">✓ Done</span>
                    ) : isFailed ? (
                      <span className="text-red-400">✗ Failed</span>
                    ) : (
                      <span className="text-slate-600">Pending</span>
                    )}
                  </div>

                  {/* Counts & Data Summary */}
                  {phaseData && (
                    <div className="text-[11px] text-slate-300 space-y-0.5 pt-1 border-t border-slate-800/60 font-mono">
                      {pName === "clean_db" && (
                        <p>Cleaned all temporary collections</p>
                      )}
                      {pName === "collect" && (
                        <p>New: {phaseData.new || 0} | Dupes: {phaseData.skipped_dupes || 0}</p>
                      )}
                      {pName === "clean" && (
                        <p>Cleaned: {phaseData.cleaned || 0} | Short: {phaseData.rejected_short || 0}</p>
                      )}
                      {pName === "filter" && (
                        <p>OK: {phaseData.filtered_ok || 0} | Rejected: {phaseData.rejected_offtopic || 0}</p>
                      )}
                      {pName === "embed" && (
                        <p>Processed: {phaseData.processed || 0} | Failed: {phaseData.failed || 0}</p>
                      )}
                      {pName === "cluster" && (
                        <p>Events: {phaseData.events_created || 0} | Singletons: {phaseData.singleton_events || 0}</p>
                      )}
                      {pName === "summarize" && (
                        <p>Summarized: {phaseData.summarized || 0} | Fallback: {phaseData.fallback_used || 0}</p>
                      )}

                      {phaseData.errors && phaseData.errors.length > 0 && (
                        <p className="text-red-400 font-sans mt-1">
                          ⚠️ {phaseData.errors.length} error(s)
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Historical Logs Section */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-200">Historical Run Logs</h2>

          {logs.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center text-slate-400 text-sm">
              No historical pipeline logs found.
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => {
                const isExpanded = expandedLogId === log.run_id;
                const isSuccess = log.overall_status === "completed";

                return (
                  <div
                    key={log.run_id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3"
                  >
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setExpandedLogId(isExpanded ? null : log.run_id)}
                    >
                      <div className="flex items-center space-x-3">
                        <Badge variant={isSuccess ? "high_trust" : "low_trust"}>
                          {log.overall_status?.toUpperCase() || "UNKNOWN"}
                        </Badge>
                        <span className="font-mono text-xs text-slate-300">Run #{log.run_id.slice(-8)}</span>
                        <span className="text-xs text-slate-500">
                          Started: {new Date(log.started_at).toLocaleString()}
                        </span>
                      </div>

                      <button type="button" className="text-xs text-indigo-400 font-semibold">
                        {isExpanded ? "Collapse ▲" : "Expand Details ▼"}
                      </button>
                    </div>

                    {/* Expandable Phase Breakdown */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-slate-800 space-y-2">
                        <h4 className="text-xs font-semibold uppercase text-slate-400">Phase Details</h4>
                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs space-y-1 max-h-60 overflow-y-auto">
                          {log.phases && log.phases.length > 0 ? (
                            log.phases.map((p, idx) => (
                              <div key={idx} className="border-b border-slate-800/60 pb-1 text-slate-300">
                                <span className="text-indigo-400 font-bold">[{p.phase}]</span> status={p.status}{" "}
                                {JSON.stringify(p)}
                              </div>
                            ))
                          ) : (
                            <span className="text-slate-500">No phase breakdown emitted.</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Confirmation Modal — Run Pipeline */}
        <Modal
          open={showRunConfirm}
          onClose={() => setShowRunConfirm(false)}
          title="Confirm Run Pipeline"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              Running the pipeline will wipe all current articles, events, vectors, and chat history (retaining only news sources), then ingest and process new intelligence.
            </p>
            <p className="text-sm font-semibold text-amber-400">Are you sure you want to proceed?</p>
            <div className="flex justify-end space-x-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowRunConfirm(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleRunPipeline}>
                Confirm Run Pipeline
              </Button>
            </div>
          </div>
        </Modal>

        {/* Confirmation Modal — Clean Database */}
        <Modal
          open={showCleanConfirm}
          onClose={() => setShowCleanConfirm(false)}
          title="Confirm Clean Database"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              Cleaning the database will permanently delete all ingested articles, events, entities, vector stores, and chat history. News sources will remain intact.
            </p>
            <p className="text-sm font-semibold text-red-400">This action cannot be undone. Continue?</p>
            <div className="flex justify-end space-x-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowCleanConfirm(false)}>
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
