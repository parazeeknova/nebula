"use client";

import { useEffect } from "react";

import { TrashIcon, XIcon } from "../icons";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  roomName: string;
}

export const DeleteRoomModal = ({
  isOpen,
  onClose,
  onConfirm,
  roomName,
}: Props) => {
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

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Delete room"
    >
      <div
        className="bg-panel-2 shadow-pop w-full max-w-md overflow-hidden border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
          <TrashIcon className="h-4 w-4 text-rose-400" />
          <h2 className="font-display flex-1 truncate text-[15px] font-bold text-white">
            Delete room
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-ink-dim hover:text-ink p-1.5 transition hover:bg-white/5"
          >
            <XIcon />
          </button>
        </div>

        <div className="px-4 py-4">
          <p className="text-ink-dim text-[13px] leading-relaxed">
            Are you sure you want to delete{" "}
            <strong className="text-white">#{roomName}</strong>? This will
            archive the room and remove it from the workspace for all members.
          </p>

          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-ink-dim hover:text-ink px-3 py-1.5 text-[13px] font-medium transition hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="bg-rose hover:bg-rose/90 px-4 py-1.5 text-[13px] font-semibold text-white shadow-[0_4px_14px_rgba(242,63,67,0.4)] transition"
            >
              Delete Room
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
