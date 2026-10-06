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
    <div className="min-h-screen bg-[#F1E8C7] dark:bg-[#161912] text-[#242918] dark:text-[#F1E8C7] flex flex-col font-sans transition-colors duration-200">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3 pb-4 border-b border-[#DDD2A8] dark:border-[#343B2A]">
          <div>
            <div className="text-[11px] font-mono uppercase text-[#6A734D] dark:text-[#B5BC94] tracking-wider">
              Feed Registry / Defense Feeds
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-medium tracking-tight text-[#191F0E] dark:text-[#F1E8C7] mt-1">
              Monitored Intelligence Sources
            </h1>
            <p className="text-xs sm:text-sm text-[#555C3E] dark:text-[#CBD1B4] mt-1">
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
        <div className="bg-[#FAF6E9] dark:bg-[#1F241A] border border-[#DDD2A8] dark:border-[#343B2A] rounded-md p-4 text-xs text-[#555C3E] dark:text-[#CBD1B4] flex items-start space-x-3 shadow-sm">
          <ShieldIcon size={16} className="text-[#9CA764] mt-0.5 shrink-0" />
          <div className="leading-relaxed">
            <span className="font-semibold text-[#191F0E] dark:text-[#F1E8C7]">
              Persistent Source Configuration:
            </span>{" "}
            Intelligence sources are strictly preserved across pipeline executions and database wipes. While articles, events, and vector indexes are refreshed on every run, configured sources remain permanently active.
          </div>
        </div>

        {/* Content Table */}
        {loading ? (
          <div className="bg-[#FAF6E9] dark:bg-[#1F241A] border border-[#DDD2A8] dark:border-[#343B2A] rounded-md p-8 animate-pulse h-48"></div>
        ) : error ? (
          <div className="bg-[#FBEAE8] dark:bg-[#2A1E1E] border border-[#E8B4B4] dark:border-[#522525] rounded-md p-4 text-xs text-[#8C3A3A] dark:text-[#E07A7A]">
            <span className="font-semibold">Error:</span> {error}
          </div>
        ) : sources.length === 0 ? (
          <div className="bg-[#FAF6E9] dark:bg-[#1F241A] border border-[#DDD2A8] dark:border-[#343B2A] rounded-md p-8 text-center text-xs text-[#6A734D] dark:text-[#CBD1B4] space-y-2">
            <p className="font-medium text-[#191F0E] dark:text-[#F1E8C7]">No intelligence sources configured</p>
            <p>Click "Add Source" to register an RSS or news feed for ingestion.</p>
          </div>
        ) : (
          <Table>
            <thead>
              <tr className="border-b border-[#DDD2A8] dark:border-[#343B2A] bg-[#F1E8C7] dark:bg-[#161912] text-[#6A734D] dark:text-[#B5BC94] font-mono text-[11px] uppercase">
                <th className="p-3">Source Name</th>
                <th className="p-3">Protocol Type</th>
                <th className="p-3">Feed Endpoint URL</th>
                <th className="p-3">Ingestion Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDD2A8] dark:divide-[#343B2A]">
              {sources.map((src) => (
                <tr key={src.id} className="hover:bg-[#F4EED9] dark:hover:bg-[#252B1F] transition-colors">
                  <td className="p-3 font-medium text-[#191F0E] dark:text-[#F1E8C7]">
                    {src.name}
                  </td>
                  <td className="p-3 font-mono text-[11px] uppercase text-[#6A734D] dark:text-[#B5BC94]">
                    <span className="px-1.5 py-0.5 rounded bg-[#F1E8C7] dark:bg-[#252B1F] border border-[#DDD2A8] dark:border-[#343B2A]">
                      {src.type}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-xs text-[#555C3E] dark:text-[#CBD1B4] max-w-sm truncate">
                    {src.url}
                  </td>
                  <td className="p-3">
                    {src.active !== false ? (
                      <span className="inline-flex items-center space-x-1.5 text-xs text-[#4F6830] dark:text-[#9CA764] font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#4F6830] dark:bg-[#9CA764]" />
                        <span>Active</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1.5 text-xs text-[#8C887B] dark:text-[#7A7E6C] font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#8C887B] dark:bg-[#7A7E6C]" />
                        <span>Disabled</span>
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    {src.active !== false && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[#8C3A3A] dark:text-[#E07A7A] hover:bg-[#FBEAE8] dark:hover:bg-[#2A1E1E]"
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
              <div className="bg-[#FBEAE8] dark:bg-[#2A1E1E] border border-[#E8B4B4] dark:border-[#522525] text-[#8C3A3A] dark:text-[#E07A7A] p-3 rounded text-xs">
                {modalError}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-mono uppercase text-[#6A734D] dark:text-[#B5BC94] block">
                Source Provider Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Reuters Defense News, Defense News"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-[#FCF9EF] dark:bg-[#161912] border border-[#DDD2A8] dark:border-[#343B2A] rounded-md px-3 py-1.5 text-xs text-[#191F0E] dark:text-[#F1E8C7] placeholder-[#8C887B] focus:border-[#9CA764] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono uppercase text-[#6A734D] dark:text-[#B5BC94] block">
                Protocol Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full bg-[#FCF9EF] dark:bg-[#161912] border border-[#DDD2A8] dark:border-[#343B2A] rounded-md px-2.5 py-1.5 text-xs text-[#191F0E] dark:text-[#F1E8C7] focus:border-[#9CA764] focus:outline-none"
              >
                <option value="rss">RSS / Atom Feed</option>
                <option value="api">REST API</option>
                <option value="scrape">HTML Web Scraper</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono uppercase text-[#6A734D] dark:text-[#B5BC94] block">
                Target Feed URL
              </label>
              <input
                type="url"
                required
                placeholder="https://feeds.example.com/defense/rss.xml"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="w-full bg-[#FCF9EF] dark:bg-[#161912] border border-[#DDD2A8] dark:border-[#343B2A] rounded-md px-3 py-1.5 text-xs text-[#191F0E] dark:text-[#F1E8C7] placeholder-[#8C887B] focus:border-[#9CA764] focus:outline-none font-mono"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-[#DDD2A8] dark:border-[#343B2A]">
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
