"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { FeedbackIcon, SendIcon, XIcon } from "../icons";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type Status = "idle" | "sending" | "success" | "error";

export const FeedbackModal = ({ isOpen, onClose }: Props) => {
  const [email, setEmail] = useState("");
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (status === "sending") {
      return;
    }
    setError(null);
    setStatus("sending");
    try {
      const res = await fetch("/api/feedback", {
        body: JSON.stringify({ email: email.trim(), text }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Failed to send feedback");
      }
      setStatus("success");
      setText("");
    } catch (sendError) {
      setStatus("error");
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Failed to send feedback"
      );
    }
  };

  const close = () => {
    setStatus("idle");
    setError(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4 backdrop-blur-[2px]"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label="Send feedback"
    >
      <div
        className="bg-panel-2 shadow-pop w-full max-w-md overflow-hidden border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
          <FeedbackIcon className="text-blurple h-4 w-4" />
          <h2 className="font-display flex-1 truncate text-[15px] font-bold text-white">
            Send feedback
          </h2>
          <button
            onClick={close}
            aria-label="Close"
            className="text-ink-dim hover:text-ink p-1.5 transition hover:bg-white/5"
          >
            <XIcon />
          </button>
        </div>

        {status === "success" ? (
          <div className="px-4 py-6 text-center">
            <p className="text-mint text-[14px] font-semibold">
              Thanks! Your feedback has been sent.
            </p>
            <button
              onClick={close}
              className="bg-blurple hover:bg-blurple-deep mt-5 px-4 py-1.5 text-[13px] font-semibold text-white transition"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-4 py-4">
            <label
              htmlFor="feedback-email"
              className="text-ink-dim block text-[13px] font-medium"
            >
              Your email
            </label>
            <input
              id="feedback-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="focus:border-blurple/80 focus:ring-blurple/50 mt-2 w-full border border-white/10 bg-black/50 px-3 py-2 text-[14px] text-white ring-1 ring-transparent transition outline-none"
            />

            <label
              htmlFor="feedback-text"
              className="text-ink-dim mt-4 block text-[13px] font-medium"
            >
              Feedback
            </label>
            <textarea
              id="feedback-text"
              required
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Tell us what you think…"
              maxLength={5000}
              className="focus:border-blurple/80 focus:ring-blurple/50 mt-2 w-full resize-none border border-white/10 bg-black/50 px-3 py-2 text-[14px] text-white ring-1 ring-transparent transition outline-none"
            />

            {status === "error" && error && (
              <p className="text-rose mt-2 text-[12px] font-medium">{error}</p>
            )}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={close}
                className="text-ink-dim hover:text-ink px-3 py-1.5 text-[13px] font-medium transition hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={status === "sending" || !email.trim() || !text.trim()}
                className="bg-blurple hover:bg-blurple-deep flex items-center gap-1.5 px-4 py-1.5 text-[13px] font-semibold text-white transition disabled:opacity-50"
              >
                <SendIcon className="h-3.5 w-3.5" />
                {status === "sending" ? "Sending…" : "Send"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
