"use client";

/**
 * Mock placeholder (skeleton) components for the chat feed and the
 * people/agents panel. Shown while the connection is establishing —
 * same geometry as the real rows so there's zero layout shift
 * when content swaps in.
 */

const bone = "animate-pulse rounded bg-white/[0.07]";

const ChatRow = ({
  w1,
  w2,
  compact = false,
}: {
  w1: string;
  w2: string;
  compact?: boolean;
}) => {
  if (compact) {
    return (
      <div className="px-4 py-[3px] pl-[68px]">
        <div className={`${bone} h-4`} style={{ width: w1 }} />
      </div>
    );
  }
  return (
    <div className="flex gap-3 px-4 pt-4 pb-1">
      <div className={`${bone} h-10 w-10 shrink-0 !rounded-full`} />
      <div className="min-w-0 flex-1 space-y-2 pt-0.5">
        <div className="flex items-center gap-2">
          <div className={`${bone} h-3.5 w-24`} />
          <div className={`${bone} h-3 w-14`} />
        </div>
        <div className={`${bone} h-4`} style={{ width: w1 }} />
        <div className={`${bone} h-4`} style={{ width: w2 }} />
      </div>
    </div>
  );
};

export const ChatSkeleton = ({ roomName }: { roomName: string }) => (
  <div
    className="min-h-0 flex-1 overflow-hidden pb-4"
    role="status"
    aria-busy="true"
    aria-label="Loading messages"
  >
    <div className="px-4 pt-6 pb-4">
      <div className="bg-panel h-16 w-16 animate-pulse rounded-2xl ring-1 ring-white/10" />
      <div className={`${bone} mt-3 h-7 w-56`} />
      <div className={`${bone} mt-2 h-4 w-80 max-w-full`} />
    </div>
    <ChatRow w1="92%" w2="64%" />
    <ChatRow w1="78%" w2="41%" />
    <ChatRow w1="55%" w2="0%" compact />
    <ChatRow w1="85%" w2="58%" />
    <ChatRow w1="70%" w2="0%" compact />
    <ChatRow w1="88%" w2="47%" />
    <span className="sr-only">Loading messages for {roomName}…</span>
  </div>
);

const PersonRow = () => (
  <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
    <div className={`${bone} h-8 w-8 shrink-0 !rounded-full`} />
    <div className="min-w-0 flex-1 space-y-1.5">
      <div className={`${bone} h-3 w-3/4`} />
      <div className={`${bone} h-2.5 w-1/2`} />
    </div>
  </div>
);

export const PeopleSkeleton = () => (
  <div
    className="bg-panel flex w-60 shrink-0 flex-col overflow-hidden border-l border-white/[0.06] px-2 py-3"
    role="status"
    aria-busy="true"
    aria-label="Loading members"
  >
    <p className="text-ink-faint px-2 pt-1 pb-1.5 font-mono text-[10px] font-bold tracking-[0.14em] uppercase">
      Active agents
    </p>
    <PersonRow />
    <PersonRow />
    <PersonRow />
    <p className="text-ink-faint px-2 pt-4 pb-1.5 font-mono text-[10px] font-bold tracking-[0.14em] uppercase">
      Members
    </p>
    <PersonRow />
    <PersonRow />
    <PersonRow />
    <PersonRow />
    <span className="sr-only">Loading members and agents…</span>
  </div>
);
