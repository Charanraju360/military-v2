import React, { useEffect, useState } from "react";
import { apiClient } from "../api/client";
import Navbar, { navigate } from "../components/Navbar";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import {
  CalendarIcon,
  ChevronRightIcon,
  CrosshairIcon,
  FilterIcon,
  LocationIcon,
  MapIcon,
} from "../components/ui/Icons";

// Analytical global theatres
const THEATRES = [
  {
    id: "middle-east",
    name: "Middle East & Red Sea",
    coordinates: "15.0° N, 42.5° E",
    x: 580,
    y: 280,
    keywords: ["red sea", "yemen", "houthi", "israel", "gaza", "lebanon", "iran", "syria", "iraq", "gulf"],
  },
  {
    id: "eastern-europe",
    name: "Eastern Europe & Black Sea",
    coordinates: "48.0° N, 37.0° E",
    x: 550,
    y: 165,
    keywords: ["ukraine", "russia", "black sea", "crimea", "donetsk", "belarus", "kyiv", "moscow", "poland"],
  },
  {
    id: "baltic-nordic",
    name: "Baltic & Nordic Littoral",
    coordinates: "57.5° N, 20.0° E",
    x: 505,
    y: 125,
    keywords: ["baltic", "estonia", "latvia", "lithuania", "finland", "sweden", "gotland", "nato"],
  },
  {
    id: "indo-pacific",
    name: "Indo-Pacific & South China Sea",
    coordinates: "16.0° N, 114.0° E",
    x: 770,
    y: 280,
    keywords: ["taiwan", "china", "south china sea", "philippines", "spratly", "japan", "korea"],
  },
  {
    id: "persian-gulf",
    name: "Persian Gulf & Strait of Hormuz",
    coordinates: "26.5° N, 56.0° E",
    x: 620,
    y: 245,
    keywords: ["hormuz", "oman", "persian gulf", "uae", "saudi", "centcom"],
  },
  {
    id: "eastern-med",
    name: "Eastern Mediterranean",
    coordinates: "34.0° N, 33.0° E",
    x: 540,
    y: 220,
    keywords: ["mediterranean", "cyprus", "greece", "turkey"],
  },
];

export default function MapPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTheatre, setSelectedTheatre] = useState(THEATRES[0]);
  const [selectedCategory, setSelectedCategory] = useState("");

  useEffect(() => {
    const loadEvents = async () => {
      setLoading(true);
      try {
        const data = await apiClient.fetchEvents({ page: 1, page_size: 50 });
        setEvents(data.items || []);
      } catch (err) {
        console.error("Failed to load map events", err);
      } finally {
        setLoading(false);
      }
    };
    loadEvents();
  }, []);

  // Filter events by selected theatre
  const theatreEvents = events.filter((ev) => {
    if (selectedCategory && ev.category !== selectedCategory) return false;
    const text = (ev.summary || "").toLowerCase();
    return selectedTheatre.keywords.some((kw) => text.includes(kw));
  });

  const remainingEvents = events.filter(
    (ev) => !theatreEvents.some((te) => te.id === ev.id)
  );

  return (
    <div className="min-h-screen bg-[#F7F5F0] text-[#25231F] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3 pb-4 border-b border-[#E6E2DA]">
          <div>
            <div className="text-[11px] font-mono uppercase text-[#706D66]">
              Geographic Intelligence / Strategic Theatres
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-medium tracking-tight text-[#25231F] mt-1">
              Geographic Theatre Analysis
            </h1>
            <p className="text-xs sm:text-sm text-[#706D66] mt-1">
              Spatial distribution of clustered military events across global strategic choke-points and operational zones.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono text-[#858078]">
            <span>{events.length} geo-referenced events</span>
          </div>
        </div>

        {/* Analytical Map Surface & Details Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Analytical Vector Basemap (7 cols) */}
          <div className="lg:col-span-7 bg-[#FFFFFF] border border-[#E6E2DA] rounded-md p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0EDE6] pb-2 text-xs">
              <span className="font-mono text-[#706D66] uppercase text-[11px]">
                Analytical Basemap Projection (Plate Carrée)
              </span>
              <span className="font-mono text-[#858078] text-[11px]">
                Scale: Strategic Theater Level
              </span>
            </div>

            {/* Restrained Monochrome Map Canvas / SVG */}
            <div className="relative w-full aspect-[16/10] bg-[#F9F7F2] border border-[#E8E4DC] rounded overflow-hidden select-none">
              <svg
                viewBox="0 0 1000 550"
                className="w-full h-full stroke-[#D5CFC3] fill-[#EDE9E0]"
              >
                {/* Simplified restrained continental masses */}
                {/* North America */}
                <path d="M 120 70 L 260 70 L 290 120 L 250 180 L 230 250 L 190 280 L 160 230 L 120 180 Z" />
                {/* South America */}
                <path d="M 230 280 L 320 320 L 330 400 L 280 480 L 250 430 L 230 350 Z" />
                {/* Europe */}
                <path d="M 460 70 L 580 80 L 590 160 L 530 180 L 480 170 L 460 120 Z" />
                {/* Africa */}
                <path d="M 460 190 L 580 190 L 600 280 L 560 410 L 500 420 L 450 310 L 450 220 Z" />
                {/* Asia */}
                <path d="M 590 70 L 890 80 L 880 200 L 820 280 L 740 300 L 650 250 L 600 170 Z" />
                {/* Australia */}
                <path d="M 780 340 L 880 340 L 890 420 L 810 430 Z" />

                {/* Subtle Coordinate Grid Lines */}
                <line x1="0" y1="275" x2="1000" y2="275" stroke="#DFD9CC" strokeDasharray="3 3" />
                <line x1="500" y1="0" x2="500" y2="550" stroke="#DFD9CC" strokeDasharray="3 3" />

                {/* Strategic Theatre Markers */}
                {THEATRES.map((th) => {
                  const isSelected = selectedTheatre.id === th.id;
                  const matchingCount = events.filter((e) =>
                    th.keywords.some((k) => (e.summary || "").toLowerCase().includes(k))
                  ).length;

                  return (
                    <g
                      key={th.id}
                      onClick={() => setSelectedTheatre(th)}
                      className="cursor-pointer group"
                    >
                      {/* Pulse circle if selected */}
                      {isSelected && (
                        <circle
                          cx={th.x}
                          cy={th.y}
                          r={14}
                          fill="#C96A4A"
                          fillOpacity="0.15"
                          stroke="#C96A4A"
                          strokeWidth="1"
                        />
                      )}

                      {/* Main point marker */}
                      <circle
                        cx={th.x}
                        cy={th.y}
                        r={isSelected ? 5 : 4}
                        fill={isSelected ? "#C96A4A" : "#302E2A"}
                        stroke="#FFFFFF"
                        strokeWidth="1.5"
                      />

                      {/* Text label */}
                      <text
                        x={th.x + 8}
                        y={th.y + 4}
                        fontSize="9"
                        fontFamily="Inter, sans-serif"
                        fontWeight={isSelected ? "600" : "500"}
                        fill={isSelected ? "#B85C3E" : "#47423B"}
                        className="pointer-events-none"
                      >
                        {th.name.split(" ")[0]} ({matchingCount})
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Bottom map metadata legend */}
              <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded bg-[#FFFFFF]/90 border border-[#E6E2DA] text-[10px] font-mono text-[#706D66] backdrop-blur-[2px]">
                Active Theatre: <span className="font-semibold text-[#25231F]">{selectedTheatre.name}</span> · {selectedTheatre.coordinates}
              </div>
            </div>

            {/* Quick Theatre Selector Buttons */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {THEATRES.map((th) => (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => setSelectedTheatre(th)}
                  className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                    selectedTheatre.id === th.id
                      ? "bg-[#C96A4A] text-white border-[#B85C3E] font-medium"
                      : "bg-[#FCFBF9] text-[#47423B] border-[#DEDAD2] hover:bg-[#F2EFE8]"
                  }`}
                >
                  {th.name}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Selected Theatre Intelligence Stream (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-[#FFFFFF] border border-[#E6E2DA] rounded-md p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-3">
              <div className="flex items-start justify-between border-b border-[#F0EDE6] pb-3">
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#706D66]">
                    Operational Theatre Dossier
                  </span>
                  <h2 className="text-base font-serif font-medium text-[#25231F] mt-0.5">
                    {selectedTheatre.name}
                  </h2>
                  <p className="text-xs font-mono text-[#858078] mt-0.5">
                    Coordinates: {selectedTheatre.coordinates}
                  </p>
                </div>
                <Badge variant="default">{theatreEvents.length} events active</Badge>
              </div>

              {/* Theatre Events List */}
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {theatreEvents.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#706D66] space-y-2 bg-[#FCFBF9] border border-[#EBE7DF] rounded">
                    <p className="font-medium text-[#25231F]">No current events detected</p>
                    <p>
                      No articles in the current database mention key strategic actors for this operational theatre.
                    </p>
                  </div>
                ) : (
                  theatreEvents.map((evt) => (
                    <div
                      key={evt.id}
                      onClick={() => navigate(`/events/${evt.id}`)}
                      className="p-3 bg-[#FCFBF9] border border-[#EBE7DF] hover:border-[#D0C9BC] rounded cursor-pointer space-y-1.5 transition-colors group"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <Badge variant={evt.category || "OTHER_MILITARY"}>
                          {evt.category || "OTHER_MILITARY"}
                        </Badge>
                        <span className="text-[#858078] font-mono">
                          {evt.article_count || 1} report(s)
                        </span>
                      </div>

                      <p className="text-xs text-[#302E2A] leading-relaxed line-clamp-2">
                        {evt.summary}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-[#858078] pt-1 border-t border-[#F2EFE8]">
                        <span className="font-mono">#{evt.id.slice(-6)}</span>
                        <span className="text-[#C96A4A] group-hover:text-[#B85C3E] font-medium flex items-center space-x-1">
                          <span>Inspect Report</span>
                          <ChevronRightIcon size={11} />
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
