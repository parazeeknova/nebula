"use client";

import { SparkleIcon } from "../icons";

export const MergeBanner = ({
  roomName,
  angles,
}: {
  roomName: string;
  angles: { label: string; state: string }[];
}) => {
  const labels = angles.map((a) => a.label).filter((l) => l.length > 0);
  const detail = labels.length > 0 ? ` — ${labels.join(" × ")}` : "";
  return (
    <div className="border-blurple/25 from-blurple/15 shrink-0 border-b bg-gradient-to-r via-[#8b5cf6]/10 to-transparent px-4 py-2">
      <div className="flex items-center gap-3">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="bg-blurple absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" />
          <span className="bg-blurple relative inline-flex h-2.5 w-2.5 rounded-full" />
        </span>
        <SparkleIcon className="h-4 w-4 shrink-0 text-[#8b9bff]" />
        <p className="text-ink min-w-0 flex-1 truncate text-[13px]">
          <span className="font-bold text-white">
            Neb is merging {angles.length > 0 ? angles.length : ""} angles
          </span>
          <span className="text-ink-dim">
            {" "}
            in {roomName}
            {detail} — both streams live below, synthesis lands as one pinned
            answer.
          </span>
        </p>
        <span className="bg-blurple hidden shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold text-white shadow-[0_4px_14px_rgba(88,101,242,0.5)] sm:block">
          LIVE
        </span>
      </div>
    </div>
  );
};
