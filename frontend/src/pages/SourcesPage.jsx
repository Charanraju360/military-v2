import React, { useEffect, useState } from "react";
import { apiClient } from "../api/client";
import Navbar from "../components/Navbar";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import Table from "../components/ui/Table";
import {
  CheckIcon,
  ExternalLinkIcon,
  PlusIcon,
  RefreshIcon,
  ShieldIcon,
  SourcesIcon,
} from "../components/ui/Icons";

export default function SourcesPage() {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Add Source Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "rss",
    url: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);

  const loadSources = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.fetchSources();
      // Filter out BlackBox test / dummy sources as requested
      const filtered = (data || []).filter((s) => {
        const name = (s.name || "").toLowerCase();
        return !name.includes("blackbox");
      });
      setSources(filtered);
    } catch (err) {
      setError(err.message || "Failed to load intelligence sources.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSources();
  }, []);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.url.trim()) return;

    setSubmitting(true);
    setModalError(null);
    try {
      await apiClient.createSource({
        name: formData.name.trim(),
        type: formData.type,
        url: formData.url.trim(),
        trust_rating: 50,
      });

      setShowAddModal(false);
      setFormData({ name: "", type: "rss", url: "" });
      loadSources();
    } catch (err) {
      setModalError(err.message || "Failed to register intelligence source.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisableSource = async (sourceId) => {
    try {
      await apiClient.disableSource(sourceId);
      loadSources();
    } catch (err) {
      alert(`Error updating source status: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F5F0] text-[#25231F] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3 pb-4 border-b border-[#E6E2DA]">
          <div>
            <div className="text-[11px] font-mono uppercase text-[#706D66]">
              Feed Registry / Defense Feeds
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-medium tracking-tight text-[#25231F] mt-1">
              Monitored Intelligence Sources
            </h1>
            <p className="text-xs sm:text-sm text-[#706D66] mt-1">
              Configuration of open-source military news wires, RSS feeds, and defense portals ingested by the pipeline.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="secondary" size="sm" onClick={loadSources}>
              <RefreshIcon size={12} className={loading ? "animate-spin" : ""} />
              <span>Refresh</span>
            </Button>
            <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
              <PlusIcon size={13} />
              <span>Add Source</span>
            </Button>
          </div>
        </div>

        {/* Notice on Database Wiping Preservations */}
        <div className="bg-[#FFFFFF] border border-[#E6E2DA] rounded-md p-4 text-xs text-[#706D66] flex items-start space-x-2 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <ShieldIcon size={16} className="text-[#C96A4A] mt-0.5 shrink-0" />
          <div className="leading-relaxed">
            <span className="font-semibold text-[#25231F]">
              Persistent Source Configuration:
            </span>{" "}
            Intelligence sources are strictly preserved across pipeline executions and database wipes. While articles, events, and vector indexes are refreshed on every run, configured sources remain permanently active.
          </div>
        </div>

        {/* Content Table */}
        {loading ? (
          <div className="bg-[#FFFFFF] border border-[#E6E2DA] rounded-md p-8 animate-pulse h-48"></div>
        ) : error ? (
          <div className="bg-[#FDF2F2] border border-[#EFC7C7] rounded-md p-4 text-xs text-[#9B3838]">
            <span className="font-semibold">Error:</span> {error}
          </div>
        ) : sources.length === 0 ? (
          <div className="bg-[#FFFFFF] border border-[#E6E2DA] rounded-md p-8 text-center text-xs text-[#706D66] space-y-2">
            <p className="font-medium text-[#25231F]">No intelligence sources configured</p>
            <p>Click "Add Source" to register an RSS or news feed for ingestion.</p>
          </div>
        ) : (
          <Table>
            <thead>
              <tr className="border-b border-[#E6E2DA] bg-[#F7F5F0] text-[#706D66] font-mono text-[11px] uppercase">
                <th className="p-3">Source Name</th>
                <th className="p-3">Protocol Type</th>
                <th className="p-3">Feed Endpoint URL</th>
                <th className="p-3">Ingestion Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EDE6]">
              {sources.map((src) => (
                <tr key={src.id} className="hover:bg-[#FCFBF9] transition-colors">
                  <td className="p-3 font-medium text-[#25231F]">
                    {src.name}
                  </td>
                  <td className="p-3 font-mono text-[11px] uppercase text-[#706D66]">
                    <span className="px-1.5 py-0.5 rounded bg-[#F0EDE6] border border-[#DDD7CD]">
                      {src.type}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-xs text-[#706D66] max-w-sm truncate">
                    {src.url}
                  </td>
                  <td className="p-3">
                    {src.active !== false ? (
                      <span className="inline-flex items-center space-x-1 text-xs text-[#4A6B4E] font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#4A6B4E]" />
                        <span>Active</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 text-xs text-[#8F8A80] font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#8F8A80]" />
                        <span>Disabled</span>
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    {src.active !== false && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[#9B3838] hover:bg-[#FDF2F2]"
                        onClick={() => handleDisableSource(src.id)}
                      >
                        Deactivate
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}

        {/* Add Source Modal */}
        <Modal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Register Defense Intelligence Source"
        >
          <form onSubmit={handleAddSubmit} className="space-y-4 pt-1">
            {modalError && (
              <div className="bg-[#FDF2F2] border border-[#EFC7C7] text-[#9B3838] p-3 rounded text-xs">
                {modalError}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-mono uppercase text-[#706D66] block">
                Source Provider Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Reuters Defense News, Defense News"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-[#FFFFFF] border border-[#DEDAD2] rounded-md px-3 py-1.5 text-xs text-[#25231F] focus:border-[#C96A4A] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono uppercase text-[#706D66] block">
                Protocol Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full bg-[#FFFFFF] border border-[#DEDAD2] rounded-md px-2.5 py-1.5 text-xs text-[#25231F] focus:border-[#C96A4A] focus:outline-none"
              >
                <option value="rss">RSS / Atom Feed</option>
                <option value="api">REST API</option>
                <option value="scrape">HTML Web Scraper</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono uppercase text-[#706D66] block">
                Target Feed URL
              </label>
              <input
                type="url"
                required
                placeholder="https://feeds.example.com/defense/rss.xml"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="w-full bg-[#FFFFFF] border border-[#DEDAD2] rounded-md px-3 py-1.5 text-xs text-[#25231F] focus:border-[#C96A4A] focus:outline-none font-mono"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-[#F0EDE6]">
              <Button variant="outline" size="sm" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={submitting}>
                {submitting ? "Registering..." : "Register Source"}
              </Button>
            </div>
          </form>
        </Modal>
      </main>
    </div>
  );
}
