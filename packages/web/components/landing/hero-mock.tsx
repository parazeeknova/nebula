import {
  BotIcon,
  ChevronLeftIcon,
  CompassIcon,
  DbIcon,
  GearIcon,
  HashIcon,
  PanelIcon,
  PlusIcon,
  SearchIcon,
  SendIcon,
  ShareIcon,
  SparkleIcon,
} from "../icons";

/**
 * Miniature, faithful render of the real /app interface used in the hero:
 * sidebar (brand, search, channels, profile), room header, merge banner,
 * converging parallel streams, synthesized answer, and composer.
 * All class names mirror components/workspace/sidebar.tsx,
 * components/room/room-header.tsx, message-item.tsx, members-panel.tsx,
 * merge-banner.tsx and composer.tsx — scaled down for the hero.
 */

const TypingDots = ({ tone = "bg-ink-faint" }: { tone?: string }) => (
  <span
    className="inline-flex translate-y-[2px] items-center gap-[3px]"
    aria-hidden
  >
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className={`animate-typing inline-block h-[5px] w-[5px] ${tone}`}
        style={{ animationDelay: `${i * 0.18}s` }}
      />
    ))}
  </span>
);

const MiniAvatar = ({
  label,
  color,
  bot = false,
  size = 26,
  online,
}: {
  label: string;
  color: string;
  bot?: boolean;
  size?: number;
  online?: boolean;
}) => (
  <span
    className="relative inline-block shrink-0"
    style={{ height: size, width: size }}
    aria-hidden
  >
    <span
      className={`grid h-full w-full place-items-center font-extrabold text-white select-none ${
        bot ? "ring-1 ring-white/10" : ""
      }`}
      style={{ background: color, fontSize: size * 0.34 }}
    >
      {bot ? <BotIcon className="h-1/2 w-1/2" /> : label}
    </span>
    {online !== undefined && (
      <span
        className={`absolute -right-px -bottom-px border-2 border-black ${
          online ? "bg-mint" : "bg-ink-ghost"
        }`}
        style={{ height: size * 0.34, width: size * 0.34 }}
      />
    )}
  </span>
);

const Mention = ({ children }: { children: string }) => (
  <span className="bg-blurple-soft ring-blurple/30 px-0.5 py-px font-semibold text-[#c3cbff] ring-1">
    {children}
  </span>
);

/* ── sidebar (mirrors components/workspace/sidebar.tsx) ── */

const SidebarMini = () => (
  <div className="bg-panel hidden w-40 shrink-0 flex-col border-r border-white/[0.06] select-none sm:flex">
    {/* brand header */}
    <div className="flex h-9 shrink-0 items-center gap-2 border-b border-white/[0.06] px-2.5">
      <span className="bg-blurple-soft grid h-5 w-5 place-items-center text-[9px] font-bold text-[#8b9bff] shadow-[0_0_10px_rgba(88,101,242,0.35)]">
        N
      </span>
      <span className="font-display text-[11.5px] font-bold tracking-tight text-white">
        Nebula
      </span>
      <ChevronLeftIcon className="text-ink-ghost ml-auto h-3 w-3" />
    </div>

    {/* search */}
    <div className="px-2 pt-2">
      <div className="text-ink-ghost flex h-6 items-center gap-1.5 bg-black/60 px-2 ring-1 ring-white/10">
        <SearchIcon className="h-2.5 w-2.5" />
        <span className="text-[9.5px]">Search rooms...</span>
        <kbd className="ml-auto border border-white/10 bg-white/5 px-0.5 font-mono text-[8px]">
          ⌘K
        </kbd>
      </div>
    </div>

    {/* channels */}
    <nav className="min-h-0 flex-1 px-2 py-2.5">
      <div className="mb-1 flex items-center justify-between px-1.5">
        <span className="text-ink-faint font-mono text-[8px] font-semibold tracking-[0.14em] uppercase">
          Channels — 3
        </span>
        <PlusIcon className="text-ink-ghost h-2.5 w-2.5" />
      </div>
      <ul className="flex flex-col gap-[2px]">
        <li className="relative flex items-center">
          <span className="bg-blurple absolute top-1 bottom-1 left-0 w-[3px] shadow-[0_0_8px_rgba(88,101,242,0.8)]" />
          <span className="flex min-w-0 flex-1 items-center gap-1.5 bg-white/[0.08] px-1.5 py-[5px] text-[10.5px] font-semibold text-white">
            <HashIcon className="text-blurple h-3 w-3 shrink-0" />
            <span className="truncate">product</span>
            <span className="text-ink-ghost ml-auto flex items-center gap-1 font-mono text-[8px]">
              <span className="bg-mint h-1 w-1" />5
            </span>
          </span>
        </li>
        {[
          { name: "research", unread: true },
          { name: "gtm", unread: false },
        ].map((r) => (
          <li
            key={r.name}
            className={`flex items-center gap-1.5 px-1.5 py-[5px] text-[10.5px] ${
              r.unread ? "text-ink font-semibold" : "text-ink-dim font-medium"
            }`}
          >
            <HashIcon className="text-ink-ghost h-3 w-3 shrink-0" />
            <span className="truncate">{r.name}</span>
            {r.unread && (
              <span className="bg-blurple ml-auto h-1.5 w-1.5 shrink-0 shadow-[0_0_6px_rgba(88,101,242,0.8)]" />
            )}
          </li>
        ))}
      </ul>

      <div className="mt-3 mb-1 px-1.5">
        <span className="text-ink-faint font-mono text-[8px] font-semibold tracking-[0.14em] uppercase">
          Workspace
        </span>
      </div>
      <div className="text-ink-dim flex items-center gap-1.5 px-1.5 py-[5px] text-[10.5px] font-medium">
        <CompassIcon className="text-ink-ghost h-3 w-3" />
        <span className="flex-1 truncate">Overview</span>
        <span className="bg-blurple-soft px-1 py-px font-mono text-[8px] font-semibold text-[#8b9bff]">
          live
        </span>
      </div>
    </nav>

    {/* profile card */}
    <div className="bg-panel-2 shrink-0 border-t border-white/[0.06] px-2 py-1.5">
      <div className="flex items-center gap-1.5 px-1 py-0.5">
        <MiniAvatar label="SC" color="#5865f2" size={22} online />
        <span className="min-w-0 flex-1 leading-tight">
          <span className="text-ink block truncate text-[10px] font-semibold">
            Sara Chen
          </span>
          <span className="text-ink-faint block text-[8.5px]">online</span>
        </span>
        <GearIcon className="text-ink-ghost h-3 w-3" />
      </div>
    </div>
  </div>
);

/* ── room header (mirrors components/room/room-header.tsx) ── */

const RoomHeaderMini = () => (
  <div className="bg-chat/95 flex h-10 shrink-0 items-center gap-2 border-b border-white/[0.06] px-3">
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <span className="bg-blurple font-display grid h-5.5 w-5.5 shrink-0 place-items-center text-[10px] font-bold text-white">
        P
      </span>
      <span className="font-display truncate text-[12px] font-bold tracking-tight text-white">
        product
      </span>
      <span className="text-ink-faint hidden truncate border-l border-white/10 pl-2 text-[10px] md:block">
        shipping the shared brain
      </span>
    </div>
    <div className="text-ink-dim flex shrink-0 items-center gap-0.5">
      <span className="p-1.5">
        <ShareIcon className="h-3.5 w-3.5" />
      </span>
      <span className="p-1.5">
        <PlusIcon className="h-3.5 w-3.5" />
      </span>
      <span className="bg-blurple-soft p-1.5 text-[#8b9bff]">
        <PanelIcon className="h-3.5 w-3.5" />
      </span>
    </div>
  </div>
);

/* ── members panel (mirrors components/room/members-panel.tsx) ── */

const MembersMini = () => (
  <div className="bg-panel hidden w-36 shrink-0 flex-col overflow-hidden border-l border-white/[0.06] px-2 py-2.5 lg:flex">
    <h3 className="text-ink-faint px-1.5 pb-1.5 font-mono text-[8px] font-bold tracking-[0.14em] uppercase">
      Active agents — 1
    </h3>
    <div className="flex items-start gap-2 px-1.5 py-1.5">
      <MiniAvatar label="R" color="#26292f" size={24} bot online={false} />
      <span className="min-w-0 flex-1 leading-tight">
        <span className="text-ink block truncate text-[10px] font-bold">
          Research
        </span>
        <span className="block truncate font-mono text-[8px] text-[#8b9bff]">
          @research
        </span>
        <span className="mt-1 flex gap-1">
          <span className="bg-gold/10 text-gold ring-gold/30 px-1 py-px font-mono text-[8px] ring-1">
            ◉ web
          </span>
        </span>
      </span>
    </div>

    <h3 className="text-ink-faint px-1.5 pt-2 pb-1.5 font-mono text-[8px] font-bold tracking-[0.14em] uppercase">
      Members — 3 online
    </h3>
    {[
      { c: "#5865f2", n: "Sara Chen", typing: true },
      { c: "#eb459e", n: "Mike Kim", typing: false },
      { c: "#57f287", n: "Ana Ruiz", typing: false },
    ].map((h) => (
      <div key={h.n} className="flex items-center gap-2 px-1.5 py-1">
        <MiniAvatar
          label={h.n
            .split(" ")
            .map((p) => p[0])
            .join("")}
          color={h.c}
          size={20}
          online
        />
        <span className="min-w-0 flex-1 leading-tight">
          <span className="text-ink block truncate text-[10px] font-semibold">
            {h.n}
          </span>
          <span
            className={`block truncate text-[8.5px] ${
              h.typing ? "font-semibold text-white" : "text-ink-faint"
            }`}
          >
            {h.typing ? "typing…" : "member"}
          </span>
        </span>
        {h.typing && <TypingDots />}
      </div>
    ))}
  </div>
);

export const HeroMock = () => (
  <div
    className="border-line bg-abyss relative border shadow-[0_24px_80px_rgba(0,0,0,0.8)]"
    role="img"
    aria-label="Preview of a Neb room: two teammates ask overlapping questions, agents stream both angles in parallel, and Neb merges them into one synthesized answer."
  >
    <div className="flex">
      <SidebarMini />

      {/* room column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <RoomHeaderMini />

        {/* merge banner (mirrors merge-banner.tsx) */}
        <div className="border-blurple/25 bg-blurple/10 shrink-0 border-b px-3 py-1.5">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="bg-blurple absolute inline-flex h-full w-full animate-ping opacity-60" />
              <span className="bg-blurple relative inline-flex h-2 w-2" />
            </span>
            <SparkleIcon className="h-3 w-3 shrink-0 text-[#8b9bff]" />
            <p className="text-ink min-w-0 flex-1 truncate text-[10px]">
              <span className="font-bold text-white">
                Neb is merging 2 angles
              </span>
              <span className="text-ink-dim">
                {" "}
                in product — pricing × onboarding
              </span>
            </p>
            <span className="bg-blurple hidden shrink-0 px-1.5 py-0.5 text-[8px] font-bold text-white shadow-[0_4px_14px_rgba(88,101,242,0.5)] sm:block">
              LIVE
            </span>
          </div>
        </div>

        {/* messages (mirrors message-item.tsx) */}
        <div className="min-w-0 flex-1">
          {/* prompt 1 */}
          <div className="msg-row flex gap-2.5 px-3 pt-3 pb-0.5">
            <MiniAvatar label="SC" color="#5865f2" size={26} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-white">
                  Sara Chen
                </span>
                <span className="text-ink-ghost font-mono text-[8.5px]">
                  11:04
                </span>
              </div>
              <p className="text-ink/90 mt-0.5 text-[11px] leading-relaxed">
                <Mention>@neb</Mention> what should we ship for onboarding next
                sprint?
              </p>
            </div>
          </div>

          {/* prompt 2 — compact follow-up by another author */}
          <div className="msg-row flex gap-2.5 px-3 pt-2.5 pb-0.5">
            <MiniAvatar label="MK" color="#eb459e" size={26} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-white">
                  Mike Kim
                </span>
                <span className="text-ink-ghost font-mono text-[8.5px]">
                  11:06
                </span>
              </div>
              <p className="text-ink/90 mt-0.5 text-[11px] leading-relaxed">
                related — how do we price the team plan for 10+ seats?
              </p>
            </div>
          </div>

          {/* parallel streaming agent answer */}
          <div className="msg-row flex gap-2.5 px-3 pt-2.5 pb-1">
            <MiniAvatar label="N" color="#5865f2" size={26} bot />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                <span className="text-[11px] font-semibold text-[#8b9bff]">
                  neb
                </span>
                <span className="bg-blurple px-1 py-px text-[7.5px] font-extrabold tracking-wide text-white">
                  BOT
                </span>
                <span className="bg-blurple-soft ring-blurple/40 inline-flex items-center px-1.5 py-px font-mono text-[8px] font-semibold text-[#aab4ff] ring-1">
                  <span className="mr-1 inline-block h-1 w-1 animate-pulse bg-current" />
                  converge · running
                </span>
                <span className="text-ink-ghost font-mono text-[8.5px]">
                  11:06
                </span>
              </div>
              <p className="text-ink-faint mt-0.5 flex items-center gap-1 text-[9.5px] italic">
                <SparkleIcon className="h-2.5 w-2.5 text-[#8b9bff]" />
                Same underlying question from 2 angles — exploring both in
                parallel
              </p>

              {/* two live angle columns */}
              <div className="mt-1.5 flex gap-2">
                {[
                  {
                    l: "3 threads this week point at setup friction — pulling churn notes…",
                    t: "angle a · onboarding",
                  },
                  {
                    l: "Room memory: seat tiers drafted Tue — comparing 2 models…",
                    t: "angle b · pricing",
                  },
                ].map((a) => (
                  <div
                    key={a.t}
                    className="min-w-0 flex-1 border border-white/[0.08] bg-white/[0.02] p-2"
                  >
                    <p className="text-ink-ghost font-mono text-[7.5px] tracking-[0.14em] uppercase">
                      {a.t}
                    </p>
                    <p className="text-ink-dim mt-1 text-[9.5px] leading-snug">
                      {a.l}
                      <TypingDots />
                    </p>
                    <div className="stream-shimmer mt-1.5 h-[2px] w-3/4" />
                  </div>
                ))}
              </div>
              <p className="text-blurple mt-1 inline-flex items-center gap-1 font-mono text-[8.5px] font-semibold tracking-wide">
                <DbIcon className="h-2.5 w-2.5" />
                Used room memory
              </p>
            </div>
          </div>

          {/* synthesized answer (mirrors SynthesisMessage) */}
          <div className="msg-row px-3 py-2">
            <div className="border-gold/25 bg-gold/[0.08] overflow-hidden border">
              <div className="border-gold/15 flex items-center gap-1.5 border-b px-2.5 py-1.5">
                <SparkleIcon className="text-gold h-3 w-3" />
                <span className="text-gold font-mono text-[8px] font-bold tracking-[0.12em] uppercase">
                  Synthesized answer
                </span>
                <span className="text-ink-ghost ml-auto font-mono text-[8.5px]">
                  11:09
                </span>
              </div>
              <div className="flex gap-2 px-2.5 py-2">
                <MiniAvatar label="N" color="#5865f2" size={24} bot />
                <div className="min-w-0">
                  <p className="text-ink text-[10.5px] leading-relaxed">
                    One plan covers both: tiered seats with a guided setup flow
                    — pricing angle met the onboarding angle in the middle.
                  </p>
                  <p className="text-ink-faint mt-1 text-[9px]">
                    Pinned as the room answer · from 2 merged threads
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* composer (mirrors composer.tsx) */}
        <div className="shrink-0 px-3 pb-2.5">
          <p className="text-ink-faint mb-1 flex items-center gap-1 px-0.5 text-[9px] font-medium">
            <TypingDots />
            <span className="truncate">
              <strong className="text-ink-dim">Ana</strong> is typing…
            </span>
          </p>
          <div className="mb-1 flex items-center justify-between gap-2 px-0.5">
            <span className="text-ink-dim inline-flex items-center gap-1 px-1.5 py-0.5 font-mono text-[8.5px] ring-1 ring-white/10">
              gpt-oss-120b
            </span>
            <span className="text-ink-ghost font-mono text-[8px]">
              room model
            </span>
          </div>
          <div className="bg-input flex items-center gap-2 px-2 py-1.5 ring-1 ring-white/10">
            <span className="text-ink-dim grid h-6 w-6 shrink-0 place-items-center bg-white/[0.06]">
              <PlusIcon className="h-3 w-3" />
            </span>
            <p className="text-ink-ghost min-w-0 flex-1 truncate text-[10.5px]">
              Message the room — <Mention>@neb</Mention>, @research…
            </p>
            <span className="bg-blurple grid h-6 w-6 shrink-0 place-items-center text-white shadow-[0_4px_14px_rgba(88,101,242,0.55)]">
              <SendIcon className="h-2.5 w-2.5" />
            </span>
          </div>
          <p className="text-ink-ghost mt-1 hidden px-0.5 font-mono text-[8px] sm:block">
            Enter to send · @ mentions an agent · answers stream for the whole
            room
          </p>
        </div>
      </div>

      <MembersMini />
    </div>

    {/* glow */}
    <div
      className="bg-blurple/20 pointer-events-none absolute -top-16 left-1/2 -z-10 h-40 w-3/4 -translate-x-1/2 blur-[90px]"
      aria-hidden
    />
  </div>
);
