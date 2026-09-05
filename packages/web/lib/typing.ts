"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useReducer } from "spacetimedb/react";

import { reducers } from "../src/module_bindings";
import { useSharedTables } from "./shared-tables";

const TYPING_TTL_MS = 3000;
const THROTTLE_MS = 1500;

/**
 * Live per-user status (typing / voice) relayed through SpacetimeDB so
 * separate client instances see each other's activity — BroadcastChannel
 * only works within one browser.
 */
export const useRoomUserStatus = (
  roomId: bigint,
  myIdentityHex?: string
): {
  typingIdentities: Set<string>;
  typingNames: string[];
  voiceIdentities: Set<string>;
} => {
  const { roomUserStatus: rows, users } = useSharedTables();

  return useMemo(() => {
    const typingIdentities = new Set<string>();
    const voiceIdentities = new Set<string>();
    const typingNames: string[] = [];

    for (const row of rows) {
      if (row.roomId !== roomId) {
        continue;
      }
      const hex = row.identity.toHexString();
      if (hex === myIdentityHex) {
        continue;
      }
      if (row.typing) {
        typingIdentities.add(hex);
      }
      if (row.voice) {
        voiceIdentities.add(hex);
      }
    }
    // Build typingNames in row order.
    for (const row of rows) {
      if (row.roomId !== roomId) {
        continue;
      }
      const hex = row.identity.toHexString();
      if (hex === myIdentityHex || !typingIdentities.has(hex)) {
        continue;
      }
      const user = users.find((u) => u.identity.toHexString() === hex);
      const name = user?.displayName ?? `${hex.slice(0, 8)}…`;
      typingNames.push(name);
    }
    return { typingIdentities, typingNames, voiceIdentities };
  }, [rows, users, roomId, myIdentityHex]);
};

export const useVoiceNotifier = (
  roomId: bigint,
  identityHex: string
): {
  setSpeaking: (speaking: boolean) => void;
} => {
  const setUserStatus = useReducer(reducers.setUserStatus);
  return {
    setSpeaking: useCallback(
      (speaking: boolean) => {
        if (!identityHex) {
          return;
        }
        void setUserStatus({ roomId, typing: false, voice: speaking });
      },
      [identityHex, roomId, setUserStatus]
    ),
  };
};

export const useTypingNotifier = (
  roomId: bigint,
  identityHex: string,
  _displayName: string
): {
  startTyping: () => void;
  stopTyping: () => void;
} => {
  const setUserStatus = useReducer(reducers.setUserStatus);
  const clearUserStatus = useReducer(reducers.clearUserStatus);
  const lastBroadcast = useRef(0);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (idleTimer.current) {
      clearTimeout(idleTimer.current);
      idleTimer.current = null;
    }
  }, []);

  const setStatus = useCallback(
    (typing: boolean, voice: boolean) => {
      if (!identityHex) {
        return;
      }
      void setUserStatus({ roomId, typing, voice });
    },
    [identityHex, roomId, setUserStatus]
  );

  const stopTyping = useCallback(() => {
    clearTimer();
    lastBroadcast.current = 0;
    setStatus(false, false);
  }, [clearTimer, setStatus]);

  const startTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastBroadcast.current > THROTTLE_MS) {
      lastBroadcast.current = now;
      setStatus(true, false);
    }
    clearTimer();
    idleTimer.current = setTimeout(() => {
      setStatus(false, false);
    }, TYPING_TTL_MS);
  }, [setStatus, clearTimer]);

  useEffect(
    () => () => {
      clearTimer();
      setStatus(false, false);
      void clearUserStatus({ roomId });
    },
    [clearTimer, setStatus, clearUserStatus, roomId]
  );

  return { startTyping, stopTyping };
};
