"use client";

import { BotIcon } from "../icons";

const Avatar = ({
  name,
  color,
  size = 40,
  bot = false,
  online,
}: {
  name: string;
  color: string;
  size?: number;
  bot?: boolean;
  online?: boolean;
}) => {
  const initials = name
    .split(" ")
    .map((p) => p.slice(0, 1))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <span
      className="relative inline-block shrink-0"
      style={{ height: size, width: size }}
    >
      <span
        className="grid h-full w-full place-items-center font-extrabold text-white select-none"
        style={{
          background: color,
          fontSize: size * 0.34,
        }}
        aria-hidden
      >
        {bot ? <BotIcon className="h-1/2 w-1/2" /> : initials}
      </span>
      {online !== undefined && (
        <span
          className={`border-chat absolute -right-0.5 -bottom-0.5 border-[3px] ${
            online ? "bg-mint" : "bg-ink-ghost"
          }`}
          style={{ height: size * 0.32, width: size * 0.32 }}
        />
      )}
    </span>
  );
};

export { Avatar };
