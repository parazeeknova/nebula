"use client";

import type { Agent } from "@/lib/room-types";

/** Render body text with @handles highlighted (known agents get a brand chip). */
export const MentionText = ({
  body,
  agents,
}: {
  body: string;
  agents: Agent[];
}) => {
  const parts = body.split(/(?<mention>@[\w-]+)/u);
  return (
    <>
      {parts.map((p, i) => {
        if (!p.startsWith("@")) {
          return <span key={i}>{p}</span>;
        }
        const handle = p.slice(1);
        const agent = agents.find((a) => a.handle === handle);
        return (
          <span
            key={i}
            className={`px-1 py-px font-semibold ${
              agent
                ? "bg-blurple-soft ring-blurple/30 text-[#c3cbff] ring-1"
                : "text-ink bg-white/10"
            }`}
            style={agent ? { color: agent.color } : undefined}
          >
            {p}
          </span>
        );
      })}
    </>
  );
};
