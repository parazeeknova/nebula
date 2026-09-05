"use client";

import type { ChatMessage } from "@/lib/room-types";

import { CompassIcon } from "../icons";

export const SteeringNotice = ({ msg }: { msg: ChatMessage }) => (
  <div className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-2 text-[12.5px] ring-1 ring-white/[0.06]">
    <CompassIcon className="h-3.5 w-3.5 shrink-0 text-[#8b9bff]" />
    <span className="text-ink-faint">
      User steered:{" "}
      <span className="text-ink font-medium italic">
        &ldquo;{msg.body}&rdquo;
      </span>
    </span>
    <span className="text-ink-ghost ml-auto shrink-0 font-mono text-[10px]">
      {msg.createdAt}
    </span>
  </div>
);
