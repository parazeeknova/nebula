"use client";

import { segmentContent } from "@/lib/prettify";

export const StreamingTail = () => (
  <span
    className="ml-1.5 inline-flex translate-y-[2px] items-center gap-0.5"
    aria-label="Streaming"
  >
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="animate-typing bg-ink-faint h-1 w-1"
        style={{ animationDelay: `${i * 0.18}s` }}
      />
    ))}
  </span>
);

export const PrettyBody = ({
  text,
  streaming,
}: {
  text: string;
  streaming?: boolean;
}) => {
  const segments = segmentContent(text);
  return (
    <div className="space-y-2">
      {segments.map((seg, i) => {
        if (seg.kind === "code") {
          return (
            <pre
              key={i}
              className="overflow-x-auto border border-white/[0.08] bg-black/50 px-3 py-2.5 font-mono text-[11.5px] leading-relaxed text-[#c8cdd6]"
            >
              {seg.lang ? (
                <span className="text-ink-ghost mb-2 block text-[9.5px] tracking-wider uppercase">
                  {seg.lang}
                </span>
              ) : null}
              <code className="whitespace-pre">{seg.value}</code>
            </pre>
          );
        }
        return (
          <div
            key={i}
            className="text-ink/90 text-[12.5px] leading-relaxed whitespace-pre-wrap"
          >
            {seg.value}
            {streaming && i === segments.length - 1 ? <StreamingTail /> : null}
          </div>
        );
      })}
    </div>
  );
};
