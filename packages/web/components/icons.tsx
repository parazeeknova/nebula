"use client";

interface P {
  className?: string;
}

const base = "shrink-0";
const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  strokeWidth: 2,
} as const;

export const SearchIcon = ({ className = "h-4 w-4" }: P) => (
  <svg
    viewBox="0 0 24 24"
    className={`${base} ${className}`}
    {...stroke}
    aria-hidden
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

export const XIcon = ({ className = "h-3.5 w-3.5" }: P) => (
  <svg
    viewBox="0 0 24 24"
    className={`${base} ${className}`}
    {...stroke}
    aria-hidden
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

export const PlusIcon = ({ className = "h-4 w-4" }: P) => (
  <svg
    viewBox="0 0 24 24"
    className={`${base} ${className}`}
    {...stroke}
    aria-hidden
  >
    <path d="M5 12h14" />
    <path d="M12 5v14" />
  </svg>
);

export const ChevronLeftIcon = ({ className = "h-4 w-4" }: P) => (
  <svg
    viewBox="0 0 24 24"
    className={`${base} ${className}`}
    {...stroke}
    aria-hidden
  >
    <path d="m15 18-6-6 6-6" />
  </svg>
);

export const ChevronDownIcon = ({ className = "h-3.5 w-3.5" }: P) => (
  <svg
    viewBox="0 0 24 24"
    className={`${base} ${className}`}
    {...stroke}
    aria-hidden
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const UsersIcon = ({ className = "h-4 w-4" }: P) => (
  <svg
    viewBox="0 0 24 24"
    className={`${base} ${className}`}
    {...stroke}
    aria-hidden
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export const BotIcon = ({ className = "h-4 w-4" }: P) => (
  <svg
    viewBox="0 0 24 24"
    className={`${base} ${className}`}
    {...stroke}
    aria-hidden
  >
    <path d="M12 8V4H8" />
    <rect width="16" height="12" x="4" y="8" rx="2" />
    <path d="M2 14h2" />
    <path d="M20 14h2" />
    <path d="M15 13v2" />
    <path d="M9 13v2" />
  </svg>
);

export const SendIcon = ({ className = "h-4 w-4" }: P) => (
  <svg
    viewBox="0 0 24 24"
    className={`${base} ${className}`}
    fill="currentColor"
    aria-hidden
  >
    <path d="M3.4 20.4 21.8 12 3.4 3.6l2.6 7.1 2.5 1.3-2.5 1.3-2.6 7.1Z" />
  </svg>
);

export const BellIcon = ({ className = "h-4 w-4" }: P) => (
  <svg
    viewBox="0 0 24 24"
    className={`${base} ${className}`}
    {...stroke}
    aria-hidden
  >
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

export const PinIcon = ({ className = "h-4 w-4" }: P) => (
  <svg
    viewBox="0 0 24 24"
    className={`${base} ${className}`}
    {...stroke}
    aria-hidden
  >
    <path d="M12 17v5" />
    <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16h14v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1Z" />
  </svg>
);

export const PanelIcon = ({ className = "h-4 w-4" }: P) => (
  <svg
    viewBox="0 0 24 24"
    className={`${base} ${className}`}
    {...stroke}
    aria-hidden
  >
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M15 3v18" />
  </svg>
);

export const MenuIcon = ({ className = "h-4 w-4" }: P) => (
  <svg
    viewBox="0 0 24 24"
    className={`${base} ${className}`}
    {...stroke}
    aria-hidden
  >
    <line x1="4" x2="20" y1="6" y2="6" />
    <line x1="4" x2="20" y1="12" y2="12" />
    <line x1="4" x2="20" y1="18" y2="18" />
  </svg>
);

export const SparkleIcon = ({ className = "h-3.5 w-3.5" }: P) => (
  <svg
    viewBox="0 0 24 24"
    className={`${base} ${className}`}
    fill="currentColor"
    aria-hidden
  >
    <path d="M12 2c.6 4.8 3.2 7.4 8 8-4.8.6-7.4 3.2-8 8-.6-4.8-3.2-7.4-8-8 4.8-.6 7.4-3.2 8-8Z" />
    <path
      d="M19 2c.3 2.4 1.6 3.7 4 4-2.4.3-3.7 1.6-4 4-.3-2.4-1.6-3.7-4-4 2.4-.3 3.7-1.6 4-4Z"
      opacity=".7"
    />
  </svg>
);

export const GearIcon = ({ className = "h-4 w-4" }: P) => (
  <svg
    viewBox="0 0 24 24"
    className={`${base} ${className}`}
    {...stroke}
    aria-hidden
  >
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const CompassIcon = ({ className = "h-4 w-4" }: P) => (
  <svg
    viewBox="0 0 24 24"
    className={`${base} ${className}`}
    {...stroke}
    aria-hidden
  >
    <circle cx="12" cy="12" r="10" />
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
  </svg>
);

export const DbIcon = ({ className = "h-4 w-4" }: P) => (
  <svg
    viewBox="0 0 24 24"
    className={`${base} ${className}`}
    {...stroke}
    aria-hidden
  >
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5V19A9 3 0 0 0 21 19V5" />
    <path d="M3 12A9 3 0 0 0 21 12" />
  </svg>
);
