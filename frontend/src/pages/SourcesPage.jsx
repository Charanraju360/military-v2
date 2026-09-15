import React, { useEffect, useState } from "react";
import { apiClient } from "../api/client";

import Navbar from "../components/Navbar";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import Table from "../components/ui/Table";

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
    trust_rating: 50,
  });
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);

  const loadSources = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.fetchSources();
      setSources(data || []);
    } catch (err) {
      setError(err.message || "Failed to load sources.");
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
        trust_rating: parseInt(formData.trust_rating, 10),
      });

      setShowAddModal(false);
      setFormData({ name: "", type: "rss", url: "", trust_rating: 50 });
      loadSources();
    } catch (err) {
      setModalError(err.message || "Failed to add source.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisableSource = async (sourceId) => {
    try {
      await apiClient.disableSource(sourceId);
      loadSources();
    } catch (err) {
      alert(`Error disabling source: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white">Intelligence Sources</h1>
            <p className="text-sm text-slate-400 mt-1">
              Configure news feeds, APIs, and scraped sites for automated pipeline ingestion.
            </p>
          </div>

          <Button variant="primary" onClick={() => setShowAddModal(true)}>
            + Add Intelligence Source
          </Button>
        </div>

        {/* Content Table */}
        {loading ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 animate-pulse h-48"></div>
        ) : error ? (
          <div className="bg-red-950/50 border border-red-800/60 rounded-xl p-5 text-red-300">
            <p className="font-semibold">Error loading sources</p>
            <p className="text-sm">{error}</p>
          </div>
        ) : (
          <Table>
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/50 text-slate-400 font-semibold text-xs">
                <th className="p-3">Source Name</th>
                <th className="p-3">Type</th>
                <th className="p-3">Feed URL</th>
                <th className="p-3">Trust Rating</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {sources.map((src) => (
                <tr key={src.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3 font-semibold text-slate-100">{src.name}</td>
                  <td className="p-3">
                    <span className="uppercase text-xs font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                      {src.type}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-xs text-slate-400 max-w-xs truncate">{src.url}</td>
                  <td className="p-3">
                    <Badge
                      variant={
                        src.trust_rating >= 75
                          ? "high_trust"
                          : src.trust_rating >= 50
                          ? "mid_trust"
                          : "low_trust"
                      }
                    >
                      {src.trust_rating}%
                    </Badge>
                  </td>
                  <td className="p-3">
                    {src.active ? (
                      <span className="text-xs font-medium text-emerald-400">● Active</span>
                    ) : (
                      <span className="text-xs font-medium text-slate-500">○ Disabled</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    {src.active && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300"
                        onClick={() => handleDisableSource(src.id)}
                      >
                        Disable
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
          title="Add New Intelligence Source"
        >
          <form onSubmit={handleAddSubmit} className="space-y-4">
            {modalError && (
              <div className="bg-red-950/60 border border-red-800 text-red-300 p-3 rounded-lg text-xs">
                {modalError}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-slate-400">Source Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Reuters Defense Feed"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-slate-400">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="rss">RSS Feed</option>
                  <option value="api">REST API</option>
                  <option value="scrape">HTML Scrape</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-slate-400">
                  Trust Rating ({formData.trust_rating}%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.trust_rating}
                  onChange={(e) => setFormData({ ...formData, trust_rating: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-slate-400">Feed / Article URL</label>
              <input
                type="url"
                required
                placeholder="https://example.com/rss.xml"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={submitting}>
                {submitting ? "Adding..." : "Add Source"}
              </Button>
            </div>
          </form>
        </Modal>
      </main>
    </div>
  );
}
