"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { getUserSession, saveUserSession } from "@/lib/session";

import { XIcon } from "../icons";

interface Props {
  isOpen: boolean;
  canClose?: boolean;
  initialName?: string;
  onClose?: () => void;
  onDone: (name: string) => void;
}

export const EntryFlowModal = ({
  isOpen,
  canClose = false,
  initialName = "",
  onClose,
  onDone,
}: Props) => {
  const [session, setSession] = useState(() => getUserSession());
  const [name, setName] = useState(session.name || initialName);

  useEffect(() => {
    if (isOpen) {
      const cur = getUserSession();
      setSession(cur);
      setName(cur.name || initialName);
    }
  }, [isOpen, initialName]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      return;
    }
    saveUserSession(cleanName, "");
    setSession({
      email: "",
      hasSession: true,
      name: cleanName,
      onboarded: true,
    });
    onDone(cleanName);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="entry-flow-title"
    >
      <div className="relative w-full max-w-md border border-white/10 bg-[#07080a] p-6 shadow-2xl sm:p-8">
        {canClose && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-ink-faint hover:text-ink absolute top-4 right-4 p-1.5 transition hover:bg-white/5"
            aria-label="Close modal"
          >
            <XIcon className="h-4 w-4" />
          </button>
        )}

        {/* Brand header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="bg-blurple grid h-6 w-6 place-items-center text-[12px] font-extrabold text-white shadow-[0_0_16px_rgba(88,101,242,0.6)]">
              N
            </span>
            <span className="font-display text-[15px] font-bold tracking-tight text-white">
              nebula
            </span>
          </div>
        </div>

        <div className="mt-6">
          <h2
            id="entry-flow-title"
            className="font-display text-xl font-bold tracking-tight text-white sm:text-2xl"
          >
            Welcome to Nebula
          </h2>
          <p className="text-ink-dim mt-1.5 text-[13.5px] leading-relaxed">
            What should we call you?
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="entry-name"
                className="text-ink-dim block text-[12.5px] font-semibold"
              >
                Your Name <span className="text-blurple">*</span>
              </label>
              <input
                id="entry-name"
                type="text"
                required
                autoFocus
                autoComplete="name"
                placeholder="e.g. Satoshi Nakamoto"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="focus:border-blurple focus:ring-blurple placeholder:text-ink-ghost w-full border border-white/10 bg-[#12151c] px-3.5 py-2.5 text-[14px] text-white transition outline-none focus:ring-1"
              />
            </div>

            <button
              type="submit"
              disabled={!name.trim()}
              className="bg-blurple hover:bg-blurple-deep mt-2 flex w-full cursor-pointer items-center justify-center gap-2 px-4 py-2.5 text-[14px] font-bold text-white shadow-[0_4px_14px_rgba(88,101,242,0.4)] transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span>Get started</span>
              <span aria-hidden>→</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
