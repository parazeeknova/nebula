"use client";

import { MenuIcon, PanelIcon, PlusIcon } from "../icons";

interface Props {
  name: string;
  topic: string;
  membersOpen: boolean;
  newThreadArmed: boolean;
  onToggleMembers: () => void;
  onNewThread: () => void;
  onOpenNav: () => void;
}

export const RoomHeader = ({
  name,
  topic,
  membersOpen,
  newThreadArmed,
  onToggleMembers,
  onNewThread,
  onOpenNav,
}: Props) => (
  <header className="bg-chat/95 flex h-12 shrink-0 items-center gap-2 border-b border-white/[0.06] px-3 backdrop-blur">
    <button
      className="text-ink-dim hover:text-ink rounded p-1.5 transition hover:bg-white/5 md:hidden"
      onClick={onOpenNav}
      aria-label="Open rooms"
    >
      <MenuIcon />
    </button>

    <span className="flex min-w-0 flex-1 items-center gap-2.5">
      <span className="from-blurple font-display grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br to-[#8b5cf6] text-[13px] font-bold text-white">
        {name.slice(0, 1).toUpperCase()}
      </span>
      <h1 className="font-display truncate text-[15px] font-bold tracking-tight text-white">
        {name}
      </h1>
      <span className="text-ink-faint hidden truncate border-l border-white/10 pl-3 text-[13px] lg:block">
        {topic}
      </span>
    </span>

    <div className="text-ink-dim flex shrink-0 items-center gap-0.5">
      <button
        onClick={onNewThread}
        aria-label="Start new thread"
        aria-pressed={newThreadArmed}
        title="Next message starts a new thread"
        className={`rounded p-2 transition ${
          newThreadArmed
            ? "bg-blurple-soft text-[#8b9bff]"
            : "hover:text-ink hover:bg-white/5"
        }`}
      >
        <PlusIcon />
      </button>
      <button
        onClick={onToggleMembers}
        aria-label="Toggle members"
        aria-pressed={membersOpen}
        title="Toggle members"
        className={`rounded p-2 transition ${
          membersOpen
            ? "bg-blurple-soft text-[#8b9bff]"
            : "hover:text-ink hover:bg-white/5"
        }`}
      >
        <PanelIcon />
      </button>
    </div>
  </header>
);
