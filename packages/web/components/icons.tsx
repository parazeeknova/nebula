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

export const ReplyIcon = ({ className = "h-4 w-4" }: P) => (
  <svg
    viewBox="0 0 24 24"
    className={`${base} ${className}`}
    {...stroke}
    aria-hidden
  >
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
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

export const HashIcon = ({ className = "h-4 w-4" }: P) => (
  <svg
    viewBox="0 0 24 24"
    className={`${base} ${className}`}
    {...stroke}
    aria-hidden
  >
    <line x1="4" x2="20" y1="9" y2="9" />
    <line x1="4" x2="20" y1="15" y2="15" />
    <line x1="10" x2="8" y1="3" y2="21" />
    <line x1="16" x2="14" y1="3" y2="21" />
  </svg>
);

export const ShareIcon = ({ className = "h-4 w-4" }: P) => (
  <svg
    viewBox="0 0 24 24"
    className={`${base} ${className}`}
    {...stroke}
    aria-hidden
  >
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.6" x2="15.4" y1="10.5" y2="6.5" />
    <line x1="8.6" x2="15.4" y1="13.5" y2="17.5" />
  </svg>
);

export const CopyIcon = ({ className = "h-4 w-4" }: P) => (
  <svg
    viewBox="0 0 24 24"
    className={`${base} ${className}`}
    {...stroke}
    aria-hidden
  >
    <rect width="13" height="13" x="9" y="9" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

export const CheckIcon = ({ className = "h-4 w-4" }: P) => (
  <svg
    viewBox="0 0 24 24"
    className={`${base} ${className}`}
    {...stroke}
    aria-hidden
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export const ChartIcon = ({ className = "h-4 w-4" }: P) => (
  <svg
    viewBox="0 0 24 24"
    className={`${base} ${className}`}
    {...stroke}
    aria-hidden
  >
    <path d="M3 3v16a2 2 0 0 0 2 2h16" />
    <path d="M7 13v4" />
    <path d="M12 9v8" />
    <path d="M17 5v12" />
  </svg>
);

export const PencilIcon = ({ className = "h-4 w-4" }: P) => (
  <svg
    viewBox="0 0 24 24"
    className={`${base} ${className}`}
    {...stroke}
    aria-hidden
  >
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    <path d="m15 5 4 4" />
  </svg>
);

export const TrashIcon = ({ className = "h-4 w-4" }: P) => (
  <svg
    viewBox="0 0 24 24"
    className={`${base} ${className}`}
    {...stroke}
    aria-hidden
  >
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </svg>
);

export const MoreHorizontalIcon = ({ className = "h-4 w-4" }: P) => (
  <svg
    viewBox="0 0 24 24"
    className={`${base} ${className}`}
    {...stroke}
    aria-hidden
  >
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    <circle cx="19" cy="12" r="1.5" fill="currentColor" />
    <circle cx="5" cy="12" r="1.5" fill="currentColor" />
  </svg>
);

export const VolumeIcon = ({ className = "h-4 w-4" }: P) => (
  <svg
    viewBox="0 0 24 24"
    className={`${base} ${className}`}
    {...stroke}
    aria-hidden
  >
    <path d="M11 5 6 9H2v6h4l5 4z" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
    <path d="M18.5 5.5a9 9 0 0 1 0 13" />
  </svg>
);

export const MicIcon = ({ className = "h-4 w-4" }: P) => (
  <svg
    viewBox="0 0 24 24"
    className={`${base} ${className}`}
    {...stroke}
    aria-hidden
  >
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
    <path d="M12 18v4" />
  </svg>
);
