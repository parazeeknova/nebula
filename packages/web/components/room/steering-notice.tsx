"use client";

import type { ChatMessage } from "@/lib/room-types";

export const SteeringNotice = ({ msg }: { msg: ChatMessage }) => (
  <p className="text-ink-faint px-0.5 text-[12.5px] leading-relaxed italic">
    User steered: &ldquo;{msg.body}&rdquo;
    <span className="text-ink-ghost ml-2 font-mono text-[10px] not-italic">
      {msg.createdAt}
    </span>
  </p>
);
