import React from 'react';

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const IconPlus = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconStar = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.2 5.9-.8z" />
  </svg>
);

export const IconClose = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

export const IconSearch = (props: IconProps) => (
  <svg {...base} {...props}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </svg>
);

export const IconGrid = (props: IconProps) => (
  <svg {...base} {...props}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
);

export const IconMinus = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M5 12h14" />
  </svg>
);

export const IconExternal = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M14 4h6v6" />
    <path d="M20 4l-8 8" />
    <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </svg>
);

export const IconShield = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M12 3l7 3v6c0 5-3 7.5-7 9-4-1.5-7-4-7-9V6z" />
  </svg>
);

export const IconImage = (props: IconProps) => (
  <svg {...base} {...props}>
    <rect x="3" y="4" width="18" height="16" rx="2.5" />
    <circle cx="8.5" cy="9.5" r="1.6" />
    <path d="M20 16l-4.5-4.5L6 20" />
  </svg>
);

export const IconRefresh = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M20 11a8 8 0 1 0-2.5 6.4" />
    <path d="M20 5v6h-6" />
  </svg>
);

export const IconCheck = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M4 12.5l5 5L20 6.5" />
  </svg>
);

export const IconLink = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" />
    <path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" />
  </svg>
);

export const IconLock = (props: IconProps) => (
  <svg {...base} {...props}>
    <rect x="4" y="10" width="16" height="11" rx="2.5" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </svg>
);

export const IconPower = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M12 3v9" />
    <path d="M6.5 6.5a8 8 0 1 0 11 0" />
  </svg>
);

export const IconPlay = (props: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
    <path d="M8 5v14l11-7z" />
  </svg>
);

export const IconMonitor = (props: IconProps) => (
  <svg {...base} {...props}>
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M9 20h6M12 16v4" />
  </svg>
);

export const IconTrash = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
  </svg>
);

export const IconChevron = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M9 6l6 6-6 6" />
  </svg>
);

export const IconMaximize = (props: IconProps) => (
  <svg {...base} {...props}>
    <rect x="4" y="4" width="16" height="16" rx="2" />
  </svg>
);

export const IconRestore = (props: IconProps) => (
  <svg {...base} {...props}>
    <rect x="3" y="7" width="12" height="12" rx="2" />
    <path d="M8 7V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
  </svg>
);

export const IconTerminal = (props: IconProps) => (
  <svg {...base} {...props}>
    <rect x="2.5" y="4" width="19" height="16" rx="2.5" />
    <path d="M6.5 9.5l3 2.5-3 2.5" />
    <path d="M12.5 15h5" />
  </svg>
);

export const IconFolder = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </svg>
);

export const IconFile = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
  </svg>
);

export const IconCpu = (props: IconProps) => (
  <svg {...base} {...props}>
    <rect x="6" y="6" width="12" height="12" rx="2" />
    <path d="M10 2v3M14 2v3M10 19v3M14 19v3M2 10h3M2 14h3M19 10h3M19 14h3" />
  </svg>
);

export const IconSun = (props: IconProps) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.5 1.5M17.6 17.6l1.5 1.5M19.1 4.9l-1.5 1.5M6.4 17.6l-1.5 1.5" />
  </svg>
);

export const IconVolume = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M4 10v4h3l4 4V6L7 10z" />
    <path d="M16 9a4 4 0 0 1 0 6" />
    <path d="M18.5 6.5a8 8 0 0 1 0 11" />
  </svg>
);

export const IconWifi = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M2.5 8.5a15 15 0 0 1 19 0" />
    <path d="M5.5 12a10.5 10.5 0 0 1 13 0" />
    <path d="M8.5 15.4a6 6 0 0 1 7 0" />
    <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
  </svg>
);

export const IconBluetooth = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M8 6.5L16 17l-4 3.5V3.5L16 7L8 17.5" />
  </svg>
);

export const IconMoon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
  </svg>
);

export const IconBolt = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M13 2L4.5 13.5H11l-1 8.5L19 10h-6.5z" />
  </svg>
);

export const IconChevronLeft = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M15 6l-6 6 6 6" />
  </svg>
);

export const IconBattery = (props: IconProps) => (
  <svg {...base} {...props}>
    <rect x="2" y="7" width="17" height="10" rx="2.5" />
    <path d="M21 10v4" />
    <rect x="4.5" y="9.5" width="10" height="5" rx="1" fill="currentColor" stroke="none" />
  </svg>
);

export const IconUserPlus = (props: IconProps) => (
  <svg {...base} {...props}>
    <circle cx="10" cy="8" r="3.5" />
    <path d="M4 20a6 6 0 0 1 12 0" />
    <path d="M18 8v6M15 11h6" />
  </svg>
);

export const IconExpand = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />
  </svg>
);

export const IconContract = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M9 4v5H4M15 4v5h5M20 15h-5v5M4 15h5v5" />
  </svg>
);
