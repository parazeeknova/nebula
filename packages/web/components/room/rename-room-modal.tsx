"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import { PencilIcon, XIcon } from "../icons";

interface Props {
  initialName: string;
  isOpen: boolean;
  onClose: () => void;
  onRename: (newName: string) => void;
}

export const RenameRoomModal = ({
  initialName,
  isOpen,
  onClose,
  onRename,
}: Props) => {
  const [name, setName] = useState(initialName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(initialName);
  }, [initialName, isOpen]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed && trimmed !== initialName) {
      onRename(trimmed);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Rename room"
    >
      <div
        className="bg-panel-2 shadow-pop w-full max-w-md overflow-hidden border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
          <PencilIcon className="text-blurple h-4 w-4" />
          <h2 className="font-display flex-1 truncate text-[15px] font-bold text-white">
            Rename room
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-ink-dim hover:text-ink p-1.5 transition hover:bg-white/5"
          >
            <XIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-4 py-4">
          <label
            htmlFor="room-name-input"
            className="text-ink-dim block text-[13px] font-medium"
          >
            Room name
          </label>
          <input
            id="room-name-input"
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. general, frontend-dev..."
            maxLength={64}
            className="focus:border-blurple/80 focus:ring-blurple/50 mt-2 w-full border border-white/10 bg-black/50 px-3 py-2 text-[14px] text-white ring-1 ring-transparent transition outline-none"
          />

          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-ink-dim hover:text-ink px-3 py-1.5 text-[13px] font-medium transition hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="bg-blurple hover:bg-blurple-deep px-4 py-1.5 text-[13px] font-semibold text-white shadow-[0_4px_14px_rgba(88,101,242,0.55)] transition disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
