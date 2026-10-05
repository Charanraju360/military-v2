import React, { useEffect, useState } from "react";
import { apiClient } from "../api/client";
import Navbar, { navigate } from "../components/Navbar";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import {
  ChevronRightIcon,
  EntitiesIcon,
  FilterIcon,
  SearchIcon,
} from "../components/ui/Icons";

export default function EntitiesPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState("");
  const [searchFilter, setSearchFilter] = useState("");

  useEffect(() => {
    const loadEvents = async () => {
      setLoading(true);
      try {
        const data = await apiClient.fetchEvents({ page: 1, page_size: 50 });
        setEvents(data.items || []);
      } catch (err) {
        console.error("Failed to load entities", err);
      } finally {
        setLoading(false);
      }
    };
    loadEvents();
  }, []);

  // Aggregate entities across events
  const entityMap = new Map();

  events.forEach((ev) => {
    (ev.entities || []).forEach((ent) => {
      const key = `${ent.type}:${ent.text.trim().toLowerCase()}`;
      if (!entityMap.has(key)) {
        entityMap.set(key, {
          text: ent.text.trim(),
          type: ent.type,
          count: 1,
          events: [ev],
        });
      } else {
        const existing = entityMap.get(key);
        existing.count += 1;
        if (!existing.events.some((e) => e.id === ev.id)) {
          existing.events.push(ev);
        }
      }
    });
  });

  let entitiesList = Array.from(entityMap.values()).sort((a, b) => b.count - a.count);

  if (selectedType) {
    entitiesList = entitiesList.filter((e) => e.type === selectedType);
  }

  if (searchFilter.trim()) {
    const q = searchFilter.toLowerCase();
    entitiesList = entitiesList.filter((e) => e.text.toLowerCase().includes(q));
  }

  const types = ["ORG", "LOC", "PERSON", "MISC"];

  return (
    <div className="min-h-screen bg-[#F7F5F0] text-[#25231F] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3 pb-4 border-b border-[#E6E2DA]">
          <div>
            <div className="text-[11px] font-mono uppercase text-[#706D66]">
              Entity Intelligence / Knowledge Extraction
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-medium tracking-tight text-[#25231F] mt-1">
              Extracted Entities & Actor Directory
            </h1>
            <p className="text-xs sm:text-sm text-[#706D66] mt-1">
              Named defense entities, military organizations, operational theatres, and key figures extracted via spaCy/GLiNER NER.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono text-[#858078]">
            <span>{entitiesList.length} entities tracked</span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-[#FFFFFF] border border-[#E6E2DA] rounded-md p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono uppercase text-[#706D66]">Classification:</span>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setSelectedType("")}
                className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                  selectedType === ""
                    ? "bg-[#C96A4A] text-white border-[#B85C3E]"
                    : "bg-[#FCFBF9] text-[#47423B] border-[#DEDAD2] hover:bg-[#F2EFE8]"
                }`}
              >
                All
              </button>
              {types.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedType(t)}
                  className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                    selectedType === t
                      ? "bg-[#C96A4A] text-white border-[#B85C3E]"
                      : "bg-[#FCFBF9] text-[#47423B] border-[#DEDAD2] hover:bg-[#F2EFE8]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Search entity name..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-[#FFFFFF] border border-[#DEDAD2] rounded-md px-3 py-1.5 text-xs text-[#25231F] placeholder-[#8F8A80] focus:border-[#C96A4A] focus:outline-none"
            />
          </div>
        </div>

        {/* Entities Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-[#FFFFFF] border border-[#E6E2DA] rounded-md p-5 h-28 animate-pulse space-y-2"
              >
                <div className="h-4 bg-[#F0EDE6] rounded w-1/3"></div>
                <div className="h-6 bg-[#F0EDE6] rounded w-3/4"></div>
              </div>
            ))}
          </div>
        ) : entitiesList.length === 0 ? (
          <div className="bg-[#FFFFFF] border border-[#E6E2DA] rounded-md p-10 text-center text-[#706D66] space-y-2">
            <h3 className="font-serif font-medium text-base text-[#25231F]">
              No extracted entities found
            </h3>
            <p className="text-xs">
              Entities are automatically extracted during the pipeline ingestion and NER clustering phases.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {entitiesList.map((ent, idx) => (
              <div
                key={idx}
                className="bg-[#FFFFFF] border border-[#E6E2DA] hover:border-[#D0C9BC] rounded-md p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-colors space-y-2.5"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono uppercase px-1.5 py-0.5 rounded bg-[#F0EDE6] border border-[#DDD7CD] text-[#5C574F]">
                    {ent.type}
                  </span>
                  <span className="font-mono text-[#858078]">
                    {ent.count} mention(s) across {ent.events.length} event(s)
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-[#25231F] truncate">
                  {ent.text}
                </h3>

                <div className="pt-2 border-t border-[#F0EDE6] space-y-1">
                  <span className="text-[10px] font-mono uppercase text-[#858078] block">
                    Associated Events:
                  </span>
                  <div className="space-y-1">
                    {ent.events.slice(0, 2).map((ev) => (
                      <div
                        key={ev.id}
                        onClick={() => navigate(`/events/${ev.id}`)}
                        className="text-xs text-[#C96A4A] hover:underline cursor-pointer truncate"
                      >
                        • #{ev.id.slice(-6)}: {ev.summary ? ev.summary.slice(0, 50) + "..." : "Event"}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
