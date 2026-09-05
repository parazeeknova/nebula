"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { ChevronLeftIcon, HashIcon, PlusIcon, XIcon } from "../icons";

export const parseRoomCode = (input: string): bigint | null => {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.includes("room=")) {
    const match = /(?:[?&]|^)room=(?<id>\d+)/u.exec(trimmed);
    if (match?.groups?.id) {
      try {
        const id = BigInt(match.groups.id);
        return id > 0n ? id : null;
      } catch {
        return null;
      }
    }
  }
  const clean = trimmed.replace(/^(?:#|r-|room-|-)+/iu, "").trim();
  if (/^\d+$/u.test(clean)) {
    try {
      const id = BigInt(clean);
      return id > 0n ? id : null;
    } catch {
      return null;
    }
  }
  return null;
};

interface Props {
  isOpen: boolean;
  canClose?: boolean;
  initialName?: string;
  initialEmail?: string;
  onClose?: () => void;
  onSaveProfile: (name: string, email: string) => void;
  onCreateRoom: () => void;
  onJoinRoom: (roomId: bigint) => Promise<boolean>;
}

export const EntryFlowModal = ({
  isOpen,
  canClose = false,
  initialName = "",
  initialEmail = "",
  onClose,
  onSaveProfile,
  onCreateRoom,
  onJoinRoom,
}: Props) => {
  const [step, setStep] = useState<"profile" | "choose">("profile");
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const savedName = localStorage.getItem("nebula_user_name") || initialName;
      const savedEmail =
        localStorage.getItem("nebula_user_email") || initialEmail;
      if (savedName) {
        setName(savedName);
      }
      if (savedEmail) {
        setEmail(savedEmail);
      }
    }
  }, [isOpen, initialName, initialEmail]);

  if (!isOpen) {
    return null;
  }

  const handleProfileSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    if (!cleanName || !cleanEmail) {
      return;
    }
    onSaveProfile(cleanName, cleanEmail);
    setStep("choose");
  };

  const handleCreateRoom = () => {
    setIsCreating(true);
    onCreateRoom();
  };

  const handleJoinSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setJoinError(null);
    const parsedId = parseRoomCode(roomCode);
    if (parsedId === null) {
      setJoinError("Please enter a valid room code (e.g. 1) or room URL.");
      return;
    }
    setIsJoining(true);
    try {
      const success = await onJoinRoom(parsedId);
      if (!success) {
        setJoinError("Room not found. Please verify the code and try again.");
      }
    } catch {
      setJoinError("Failed to join room. Please check the code and try again.");
    } finally {
      setIsJoining(false);
    }
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
          <span className="bg-blurple-soft px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider text-[#c3cbff] uppercase">
            {step === "profile" ? "Step 1 of 2" : "Step 2 of 2"}
          </span>
        </div>

        {step === "profile" ? (
          <div className="mt-6">
            <h2
              id="entry-flow-title"
              className="font-display text-xl font-bold tracking-tight text-white sm:text-2xl"
            >
              Welcome to Nebula
            </h2>
            <p className="text-ink-dim mt-1.5 text-[13.5px] leading-relaxed">
              Set up your profile to collaborate with autonomous agents and
              teammates in real-time.
            </p>

            <form onSubmit={handleProfileSubmit} className="mt-6 space-y-4">
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

              <div className="space-y-1.5">
                <label
                  htmlFor="entry-email"
                  className="text-ink-dim block text-[12.5px] font-semibold"
                >
                  Email Address <span className="text-blurple">*</span>
                </label>
                <input
                  id="entry-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="e.g. satoshi@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="focus:border-blurple focus:ring-blurple placeholder:text-ink-ghost w-full border border-white/10 bg-[#12151c] px-3.5 py-2.5 text-[14px] text-white transition outline-none focus:ring-1"
                />
              </div>

              <button
                type="submit"
                disabled={!name.trim() || !email.trim()}
                className="bg-blurple hover:bg-blurple-deep mt-2 flex w-full cursor-pointer items-center justify-center gap-2 px-4 py-2.5 text-[14px] font-bold text-white shadow-[0_4px_14px_rgba(88,101,242,0.4)] transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span>Continue</span>
                <span aria-hidden>→</span>
              </button>
            </form>
          </div>
        ) : (
          <div className="mt-6">
            <h2
              id="entry-flow-title"
              className="font-display text-xl font-bold tracking-tight text-white sm:text-2xl"
            >
              Choose your starting point
            </h2>
            <p className="text-ink-dim mt-1.5 text-[13.5px] leading-relaxed">
              Create a fresh room or join an existing channel with a room code.
            </p>

            <div className="mt-6 space-y-3">
              {/* Option 1: Make a room */}
              <div className="border border-white/10 bg-[#12151c] p-4 transition hover:border-white/20">
                <div className="flex items-start gap-3">
                  <div className="border-blurple/30 bg-blurple/10 text-blurple grid h-9 w-9 shrink-0 place-items-center border">
                    <PlusIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[14px] font-bold text-white">
                      Make a room
                    </h3>
                    <p className="text-ink-dim mt-0.5 text-[12px] leading-relaxed">
                      Start a new shared room with AI specialists and compounded
                      memory.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCreateRoom}
                  disabled={isCreating}
                  className="bg-blurple hover:bg-blurple-deep mt-3.5 flex w-full cursor-pointer items-center justify-center gap-1.5 px-3 py-2 text-[13px] font-bold text-white shadow-[0_4px_12px_rgba(88,101,242,0.35)] transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCreating ? "Creating room…" : "Create room →"}
                </button>
              </div>

              {/* Option 2: Join a room */}
              <div className="border border-white/10 bg-[#12151c] p-4 transition hover:border-white/20">
                <div className="flex items-start gap-3">
                  <div className="border-mint/30 bg-mint/10 text-mint grid h-9 w-9 shrink-0 place-items-center border">
                    <HashIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[14px] font-bold text-white">
                      Join a room
                    </h3>
                    <p className="text-ink-dim mt-0.5 text-[12px] leading-relaxed">
                      Enter an existing room code or invite link to join your
                      team.
                    </p>
                  </div>
                </div>

                {showJoinInput ? (
                  <form
                    onSubmit={handleJoinSubmit}
                    className="mt-3.5 space-y-2"
                  >
                    <div className="flex gap-2">
                      <input
                        type="text"
                        autoFocus
                        placeholder="e.g. 1 or paste link"
                        value={roomCode}
                        onChange={(e) => {
                          setRoomCode(e.target.value);
                          setJoinError(null);
                        }}
                        className="focus:border-mint focus:ring-mint placeholder:text-ink-ghost min-w-0 flex-1 border border-white/10 bg-black/40 px-3 py-1.5 font-mono text-[13px] text-white transition outline-none focus:ring-1"
                      />
                      <button
                        type="submit"
                        disabled={!roomCode.trim() || isJoining}
                        className="bg-mint hover:bg-mint/90 shrink-0 cursor-pointer px-3.5 py-1.5 text-[13px] font-bold text-black transition disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isJoining ? "Joining…" : "Join"}
                      </button>
                    </div>
                    {joinError && (
                      <p className="text-crimson text-[11.5px] font-medium">
                        {joinError}
                      </p>
                    )}
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setShowJoinInput(true);
                      setJoinError(null);
                    }}
                    className="mt-3.5 flex w-full cursor-pointer items-center justify-center gap-1.5 border border-white/10 bg-white/5 px-3 py-2 text-[13px] font-bold text-white transition hover:bg-white/10"
                  >
                    Enter room code →
                  </button>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setStep("profile");
                setJoinError(null);
              }}
              className="text-ink-dim hover:text-ink mt-5 flex cursor-pointer items-center gap-1 text-[12.5px] transition"
            >
              <ChevronLeftIcon className="h-3.5 w-3.5" />
              <span>Back to profile</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
