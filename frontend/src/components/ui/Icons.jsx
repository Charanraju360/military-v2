import React from "react";

export function Icon({ path, size = 16, className = "", strokeWidth = 1.75, viewBox = "0 0 24 24", fill = "none" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill={fill}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      {path}
    </svg>
  );
}

export function OverviewIcon({ size = 16, className = "" }) {
  return (
    <Icon
      size={size}
      className={className}
      path={
        <>
          <rect x="3" y="3" width="7" height="9" rx="1" />
          <rect x="14" y="3" width="7" height="5" rx="1" />
          <rect x="14" y="12" width="7" height="9" rx="1" />
          <rect x="3" y="16" width="7" height="5" rx="1" />
        </>
      }
    />
  );
}

export function EventsIcon({ size = 16, className = "" }) {
  return (
    <Icon
      size={size}
      className={className}
      path={
        <>
          <path d="M4 6h16" />
          <path d="M4 12h16" />
          <path d="M4 18h11" />
        </>
      }
    />
  );
}

export function MapIcon({ size = 16, className = "" }) {
  return (
    <Icon
      size={size}
      className={className}
      path={
        <>
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
          <line x1="8" y1="2" x2="8" y2="18" />
          <line x1="16" y1="6" x2="16" y2="22" />
        </>
      }
    />
  );
}

export function SourcesIcon({ size = 16, className = "" }) {
  return (
    <Icon
      size={size}
      className={className}
      path={
        <>
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </>
      }
    />
  );
}

export function EntitiesIcon({ size = 16, className = "" }) {
  return (
    <Icon
      size={size}
      className={className}
      path={
        <>
          <circle cx="12" cy="8" r="4" />
          <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
          <circle cx="19" cy="11" r="2.5" />
          <path d="M22 21v-1a3 3 0 0 0-2.5-2.9" />
        </>
      }
    />
  );
}

export function AnalysisIcon({ size = 16, className = "" }) {
  return (
    <Icon
      size={size}
      className={className}
      path={
        <>
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
          <line x1="3" y1="20" x2="21" y2="20" />
        </>
      }
    />
  );
}

export function ConflictIcon({ size = 16, className = "" }) {
  return (
    <Icon
      size={size}
      className={className}
      path={
        <>
          <circle cx="18" cy="18" r="3" />
          <circle cx="6" cy="6" r="3" />
          <path d="M13 6h3a2 2 0 0 1 2 2v7" />
          <line x1="6" y1="9" x2="6" y2="21" />
        </>
      }
    />
  );
}

export function AssistantIcon({ size = 16, className = "" }) {
  return (
    <Icon
      size={size}
      className={className}
      path={
        <>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <line x1="9" y1="10" x2="15" y2="10" />
          <line x1="12" y1="7" x2="12" y2="13" />
        </>
      }
    />
  );
}

export function PipelineIcon({ size = 16, className = "" }) {
  return (
    <Icon
      size={size}
      className={className}
      path={
        <>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <rect x="9" y="9" width="6" height="6" />
          <line x1="9" y1="1" x2="9" y2="4" />
          <line x1="15" y1="1" x2="15" y2="4" />
          <line x1="9" y1="20" x2="9" y2="23" />
          <line x1="15" y1="20" x2="15" y2="23" />
          <line x1="20" y1="9" x2="23" y2="9" />
          <line x1="20" y1="14" x2="23" y2="14" />
          <line x1="1" y1="9" x2="4" y2="9" />
          <line x1="1" y1="14" x2="4" y2="14" />
        </>
      }
    />
  );
}

export function SearchIcon({ size = 16, className = "" }) {
  return (
    <Icon
      size={size}
      className={className}
      path={
        <>
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </>
      }
    />
  );
}

export function FilterIcon({ size = 16, className = "" }) {
  return (
    <Icon
      size={size}
      className={className}
      path={
        <>
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </>
      }
    />
  );
}

export function CalendarIcon({ size = 14, className = "" }) {
  return (
    <Icon
      size={size}
      className={className}
      path={
        <>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </>
      }
    />
  );
}

export function LocationIcon({ size = 14, className = "" }) {
  return (
    <Icon
      size={size}
      className={className}
      path={
        <>
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </>
      }
    />
  );
}

export function ExternalLinkIcon({ size = 14, className = "" }) {
  return (
    <Icon
      size={size}
      className={className}
      path={
        <>
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </>
      }
    />
  );
}

export function ChevronRightIcon({ size = 14, className = "" }) {
  return (
    <Icon
      size={size}
      className={className}
      path={<polyline points="9 18 15 12 9 6" />}
    />
  );
}

export function ChevronLeftIcon({ size = 14, className = "" }) {
  return (
    <Icon
      size={size}
      className={className}
      path={<polyline points="15 18 9 12 15 6" />}
    />
  );
}

export function ChevronDownIcon({ size = 14, className = "" }) {
  return (
    <Icon
      size={size}
      className={className}
      path={<polyline points="6 9 12 15 18 9" />}
    />
  );
}

export function RefreshIcon({ size = 14, className = "" }) {
  return (
    <Icon
      size={size}
      className={className}
      path={
        <>
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </>
      }
    />
  );
}

export function CheckIcon({ size = 14, className = "" }) {
  return (
    <Icon
      size={size}
      className={className}
      path={<polyline points="20 6 9 17 4 12" />}
    />
  );
}

export function AlertCircleIcon({ size = 14, className = "" }) {
  return (
    <Icon
      size={size}
      className={className}
      path={
        <>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </>
      }
    />
  );
}

export function CrosshairIcon({ size = 14, className = "" }) {
  return (
    <Icon
      size={size}
      className={className}
      path={
        <>
          <circle cx="12" cy="12" r="10" />
          <line x1="22" y1="12" x2="18" y2="12" />
          <line x1="6" y1="12" x2="2" y2="12" />
          <line x1="12" y1="6" x2="12" y2="2" />
          <line x1="12" y1="22" x2="12" y2="18" />
        </>
      }
    />
  );
}

export function ShieldIcon({ size = 14, className = "" }) {
  return (
    <Icon
      size={size}
      className={className}
      path={
        <>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </>
      }
    />
  );
}

export function CloseIcon({ size = 14, className = "" }) {
  return (
    <Icon
      size={size}
      className={className}
      path={
        <>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </>
      }
    />
  );
}

export function TrashIcon({ size = 14, className = "" }) {
  return (
    <Icon
      size={size}
      className={className}
      path={
        <>
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </>
      }
    />
  );
}

export function PlusIcon({ size = 14, className = "" }) {
  return (
    <Icon
      size={size}
      className={className}
      path={
        <>
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </>
      }
    />
  );
}

export function ArrowRightIcon({ size = 14, className = "" }) {
  return (
    <Icon
      size={size}
      className={className}
      path={
        <>
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </>
      }
    />
  );
}

export function LogoMark({ size = 20, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="9" />
      <polygon points="12 3 15 9 21 12 15 15 12 21 9 15 3 12 9 9 12 3" fill="#C96A4A" stroke="#C96A4A" />
      <circle cx="12" cy="12" r="1.5" fill="#FFFFFF" />
    </svg>
  );
}

export function LayersIcon({ size = 16, className = "" }) {
  return (
    <Icon
      size={size}
      className={className}
      path={
        <>
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </>
      }
    />
  );
}

export function GlobeIcon({ size = 16, className = "" }) {
  return (
    <Icon
      size={size}
      className={className}
      path={
        <>
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </>
      }
    />
  );
}

export function ActivityIcon({ size = 16, className = "" }) {
  return (
    <Icon
      size={size}
      className={className}
      path={<polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />}
    />
  );
}

export function AlertTriangleIcon({ size = 16, className = "" }) {
  return (
    <Icon
      size={size}
      className={className}
      path={
        <>
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </>
      }
    />
  );
}

export function SunIcon({ size = 14, className = "" }) {
  return (
    <Icon
      size={size}
      className={className}
      path={
        <>
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </>
      }
    />
  );
}

export function MoonIcon({ size = 14, className = "" }) {
  return (
    <Icon
      size={size}
      className={className}
      path={
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      }
    />
  );
}


