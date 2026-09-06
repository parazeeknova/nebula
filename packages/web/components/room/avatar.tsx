"use client";

import type { ComponentType } from "react";

import { BotIcon } from "../icons";

const getStatusDotColor = (isBot: boolean, isOnline: boolean): string => {
  if (isBot) {
    return "bg-blurple";
  }
  return isOnline ? "bg-mint" : "bg-ink-ghost";
};

const Avatar = ({
  name,
  color,
  size = 40,
  bot = false,
  online,
  icon,
}: {
  name: string;
  color: string;
  size?: number;
  bot?: boolean;
  online?: boolean;
  icon?: ComponentType<{ className?: string }>;
}) => {
  const initials = name
    .split(" ")
    .map((p) => p.slice(0, 1))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const Glyph = icon ?? (bot ? BotIcon : null);

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
        {Glyph ? <Glyph className="h-1/2 w-1/2" /> : initials}
      </span>
      {online !== undefined && (
        <span
          className={`border-chat absolute -right-0.5 -bottom-0.5 border-[3px] ${getStatusDotColor(
            bot,
            online
          )}`}
          style={{ height: size * 0.32, width: size * 0.32 }}
        />
      )}
    </span>
  );
};

export { Avatar };
