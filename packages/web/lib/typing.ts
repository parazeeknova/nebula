"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface TypingEvent {
  displayName: string;
  identityHex: string;
  roomId: string;
  timestamp: number;
  type: "typing" | "stop";
}

const CHANNEL_NAME = "nebula:typing";
const TYPING_TTL_MS = 3000;
const THROTTLE_MS = 1500;

class TypingBus {
  private channel: BroadcastChannel | null = null;
  private listeners = new Set<(event: TypingEvent) => void>();

  constructor() {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.addEventListener(
          "message",
          (e: MessageEvent<TypingEvent>) => {
            this.emit(e.data);
          }
        );
      } catch {
        this.channel = null;
      }
    }
  }

  broadcast(event: TypingEvent): void {
    if (this.channel) {
      try {
        // oxlint-disable-next-line unicorn/require-post-message-target-origin
        this.channel.postMessage(event);
      } catch {
        // BroadcastChannel unavailable
      }
    }
    this.emit(event);
  }

  subscribe(listener: (event: TypingEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(event: TypingEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error("Typing listener error", error);
      }
    }
  }
}

export const typingBus = new TypingBus();

export const useTypingStatus = (
  roomId: bigint,
  myIdentityHex?: string
): {
  typingIdentities: Set<string>;
  typingNames: string[];
} => {
  const [typers, setTypers] = useState<
    Map<string, { displayName: string; expiresAt: number }>
  >(() => new Map());

  const roomIdStr = String(roomId);

  useEffect(() => {
    // Reset when room changes
    setTypers(new Map());

    const unsubscribe = typingBus.subscribe((event) => {
      if (
        event.roomId !== roomIdStr ||
        (myIdentityHex && event.identityHex === myIdentityHex)
      ) {
        return;
      }

      setTypers((prev) => {
        const next = new Map(prev);
        if (event.type === "stop") {
          next.delete(event.identityHex);
        } else {
          next.set(event.identityHex, {
            displayName: event.displayName,
            expiresAt: Date.now() + TYPING_TTL_MS,
          });
        }
        return next;
      });
    });

    const interval = setInterval(() => {
      const now = Date.now();
      setTypers((prev) => {
        let changed = false;
        const next = new Map(prev);
        for (const [hex, data] of next.entries()) {
          if (data.expiresAt <= now) {
            next.delete(hex);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 500);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [roomIdStr, myIdentityHex]);

  const typingIdentities = new Set(
    [...typers.keys()].filter((hex) => !myIdentityHex || hex !== myIdentityHex)
  );
  const typingNames = [...typers.entries()]
    .filter(([hex]) => !myIdentityHex || hex !== myIdentityHex)
    .map(([, t]) => t.displayName);

  return { typingIdentities, typingNames };
};

export const useTypingNotifier = (
  roomId: bigint,
  identityHex: string,
  displayName: string
): {
  startTyping: () => void;
  stopTyping: () => void;
} => {
  const lastBroadcast = useRef(0);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (idleTimer.current) {
      clearTimeout(idleTimer.current);
      idleTimer.current = null;
    }
  }, []);

  const stopTyping = useCallback(() => {
    clearTimer();
    lastBroadcast.current = 0;
    if (!identityHex) {
      return;
    }
    typingBus.broadcast({
      displayName,
      identityHex,
      roomId: String(roomId),
      timestamp: Date.now(),
      type: "stop",
    });
  }, [roomId, identityHex, displayName, clearTimer]);

  const startTyping = useCallback(() => {
    if (!identityHex) {
      return;
    }
    const now = Date.now();
    if (now - lastBroadcast.current > THROTTLE_MS) {
      lastBroadcast.current = now;
      typingBus.broadcast({
        displayName,
        identityHex,
        roomId: String(roomId),
        timestamp: now,
        type: "typing",
      });
    }

    clearTimer();
    idleTimer.current = setTimeout(() => {
      stopTyping();
    }, TYPING_TTL_MS);
  }, [roomId, identityHex, displayName, stopTyping, clearTimer]);

  useEffect(
    () => () => {
      clearTimer();
    },
    [clearTimer]
  );

  return { startTyping, stopTyping };
};
