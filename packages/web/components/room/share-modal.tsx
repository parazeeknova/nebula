"use client";

import { useEffect, useState } from "react";

import { CheckIcon, CopyIcon, ShareIcon, XIcon } from "../icons";

interface Props {
  roomId: bigint;
  roomName: string;
  onClose: () => void;
}

const buildUrl = (roomId: bigint): string => {
  if (typeof window === "undefined") {
    return "";
  }
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("room", roomId.toString());
  return url.toString();
};

export const ShareModal = ({ roomId, roomName, onClose }: Props) => {
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLink(buildUrl(roomId));
  }, [roomId]);

  const copy = async () => {
    if (!link) {
      return;
    }
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable; leave the input selected so the user can copy.
      const el = document.querySelector("#share-link-input");
      if (el instanceof HTMLInputElement) {
        el.select();
      }
    }
  };

  const share = async () => {
    if (!link) {
      return;
    }
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          text: `Come join the room "${roomName}" — a shared AI workspace.`,
          title: `Join ${roomName} on Nebula`,
          url: link,
        });
      } catch {
        // User cancelled the share sheet — no-op.
      }
    } else {
      void copy();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Share room"
    >
      <div
        className="bg-panel-2 shadow-pop w-full max-w-md overflow-hidden rounded-2xl border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
          <ShareIcon className="text-blurple h-4 w-4" />
          <h2 className="font-display flex-1 truncate text-[15px] font-bold text-white">
            Share “{roomName}”
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-ink-dim hover:text-ink rounded p-1.5 transition hover:bg-white/5"
          >
            <XIcon />
          </button>
        </div>

        <div className="px-4 py-4">
          <p className="text-ink-dim text-[13px] leading-relaxed">
            Anyone with this link can open the room and join the shared brain —
            past threads, memory and live streams included.
          </p>

          <div className="mt-3 flex items-center gap-2">
            <input
              id="share-link-input"
              readOnly
              value={link}
              onFocus={(e) => e.target.select()}
              aria-label="Invite link"
              className="text-ink bg-input focus:ring-blurple/60 h-10 w-full rounded-lg px-3 font-mono text-[12px] ring-1 ring-white/10 outline-none"
            />
            <button
              onClick={copy}
              aria-label="Copy link"
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg transition ${
                copied
                  ? "bg-mint text-black"
                  : "bg-blurple hover:bg-blurple-deep text-white"
              }`}
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
            </button>
          </div>

          <button
            onClick={share}
            className="bg-blurple hover:bg-blurple-deep text-ink mt-3 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-bold text-white transition"
          >
            <ShareIcon className="h-4 w-4" />
            Share invite
          </button>
        </div>
      </div>
    </div>
  );
};
