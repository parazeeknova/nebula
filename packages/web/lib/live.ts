import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Identity } from "spacetimedb";
import { useReducer, useSpacetimeDB, useTable } from "spacetimedb/react";

import { reducers, tables } from "../src/module_bindings";
import type {
  Agent as AgentRow,
  AppUser,
  Room as RoomRow,
  Thread as ThreadRow,
  Workspace as WorkspaceRow,
} from "../src/module_bindings/types";
import {
  JobStatus,
  MergeStatus,
  RoomStatus,
  ThreadStatus,
  hexOf,
} from "./room-types";
import type {
  Agent,
  ChatMessage,
  MergeBanner as MergeInfo,
  Room,
  RoomHuman,
  StreamTick,
  Thread,
  ToolCallInfo,
} from "./room-types";

const HEARTBEAT_MS = 20_000;
const ONLINE_WINDOW_MS = 5 * 60_000;

const explorationState = (status: number): string => {
  if (status === 2) {
    return "done";
  }
  if (status === 3) {
    return "failed";
  }
  return "streaming";
};

const PALETTE = [
  "#5865f2",
  "#57f287",
  "#eb459e",
  "#fee75c",
  "#00a8fc",
  "#ed7842",
] as const;

const colorFor = (seed: string): string => {
  let h = 0;
  for (const c of seed) {
    h = (h * 31 + (c.codePointAt(0) ?? 0)) % PALETTE.length;
  }
  return PALETTE[h] ?? "#5865f2";
};

const microsOf = (ts: { microsSinceUnixEpoch: bigint }): number =>
  Number(ts.microsSinceUnixEpoch / 1000n);

const timeLabel = (ts: { microsSinceUnixEpoch: bigint }): string => {
  const d = new Date(microsOf(ts));
  const time = d.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  if (d.toDateString() === new Date().toDateString()) {
    return `Today at ${time}`;
  }
  return `${d.toLocaleDateString([], { day: "numeric", month: "short" })} at ${time}`;
};

const isFresh = (ts: { microsSinceUnixEpoch: bigint }): boolean =>
  Date.now() - microsOf(ts) < ONLINE_WINDOW_MS;

const handleOf = (name: string): string =>
  name.split(" ")[0]?.toLowerCase() ?? name.toLowerCase();

const toRoom = (r: RoomRow): Room => ({
  canvasX: r.canvasX,
  canvasY: r.canvasY,
  memoryBackend: r.memoryBackend === "honcho" ? "honcho" : "hindsight",
  memoryNamespace: r.memoryNamespace,
  name: r.name,
  roomId: r.roomId,
  status: r.status,
  topic: r.topic,
  unread: undefined,
  workspaceId: r.workspaceId,
});

const toThread = (t: ThreadRow): Thread => ({
  roomId: t.roomId,
  status: t.status,
  threadId: t.threadId,
  title: t.title,
});

const byCreatedDesc = (
  a: { createdAt: { microsSinceUnixEpoch: bigint } },
  b: { createdAt: { microsSinceUnixEpoch: bigint } }
): number => {
  const da = a.createdAt.microsSinceUnixEpoch;
  const db = b.createdAt.microsSinceUnixEpoch;
  if (da === db) {
    return 0;
  }
  return da > db ? -1 : 1;
};

const pickActiveThread = (threads: readonly ThreadRow[]): ThreadRow | null => {
  if (threads.length === 0) {
    return null;
  }
  const sorted = threads.toSorted(byCreatedDesc);
  return (
    sorted.find(
      (t) =>
        t.status === ThreadStatus.Open || t.status === ThreadStatus.Streaming
    ) ??
    sorted[0] ??
    null
  );
};

/** First workspace, creating "General" once when the backend is empty. */
export const useWorkspace = (): {
  workspace: WorkspaceRow | undefined;
  ready: boolean;
} => {
  const [rows, ready] = useTable(tables.workspace);
  const createWorkspace = useReducer(reducers.createWorkspace);
  const tried = useRef(false);

  useEffect(() => {
    if (!ready || rows.length > 0 || tried.current) {
      return;
    }
    tried.current = true;
    const ensure = async (): Promise<void> => {
      try {
        await createWorkspace({ name: "General" });
      } catch (error) {
        tried.current = false;
        console.error("create_workspace failed", error);
      }
    };
    void ensure();
  }, [ready, rows.length, createWorkspace]);

  const workspace = useMemo(
    () => rows.toSorted((a, b) => (a.workspaceId < b.workspaceId ? -1 : 1))[0],
    [rows]
  );
  return { ready, workspace };
};

export const useLiveRooms = (): { rooms: Room[]; ready: boolean } => {
  const [rows, ready] = useTable(tables.room);
  const rooms = useMemo(
    () =>
      rows
        .filter((r) => r.status === RoomStatus.Active)
        .toSorted((a, b) => (a.roomId < b.roomId ? -1 : 1))
        .map(toRoom),
    [rows]
  );
  return { ready, rooms };
};

export const usePresenceCounts = (): Record<string, number> => {
  const [rows] = useTable(tables.room_presence);
  return useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of rows) {
      if (!isFresh(p.lastSeen)) {
        continue;
      }
      const key = String(p.roomId);
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [rows]);
};

export const useCreateRoom = (): ((
  workspaceId: bigint,
  name: string
) => void) => {
  const createRoom = useReducer(reducers.createRoom);
  return useCallback(
    (workspaceId: bigint, name: string) => {
      const run = async (): Promise<void> => {
        try {
          await createRoom({
            canvasX: 0,
            canvasY: 0,
            memoryBackend: "hindsight",
            memoryNamespace: `room-${Date.now()}`,
            name,
            topic: "",
            workspaceId,
          });
        } catch (error) {
          console.error("create_room failed", error);
        }
      };
      void run();
    },
    [createRoom]
  );
};

/** Join on mount + heartbeat loop while the room is open. */
export const useRoomPresence = (roomId: bigint, enabled: boolean): void => {
  const joinRoom = useReducer(reducers.joinRoom);
  const heartbeat = useReducer(reducers.heartbeat);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const beat = async (): Promise<void> => {
      try {
        await heartbeat({ roomId });
      } catch (error) {
        console.error("heartbeat failed", error);
      }
    };
    const join = async (): Promise<void> => {
      try {
        await joinRoom({ roomId });
      } catch (error) {
        console.error("join_room failed", error);
      }
    };
    void join();
    void beat();
    const t = setInterval(() => {
      void beat();
    }, HEARTBEAT_MS);
    return () => {
      clearInterval(t);
    };
  }, [roomId, enabled, joinRoom, heartbeat]);
};

/** Live stream ticks from the `stream_event` event table (never cached). */
export const useStreamTicks = (): ReadonlyMap<string, StreamTick[]> => {
  const [ticks, setTicks] = useState<ReadonlyMap<string, StreamTick[]>>(
    () => new Map()
  );

  const onInsert = useCallback(
    (row: { kind: string; messageId: bigint; payload: string }) => {
      const { kind } = row;
      if (
        kind !== "thinking" &&
        kind !== "typing" &&
        kind !== "tool_start" &&
        kind !== "tool_end"
      ) {
        return;
      }
      const tick: StreamTick = { kind, payload: row.payload };
      setTicks((prev) => {
        const next = new Map(prev);
        const key = String(row.messageId);
        next.set(key, [...(next.get(key) ?? []), tick].slice(-8));
        return next;
      });
    },
    []
  );

  useTable(tables.stream_event, { onInsert });
  return ticks;
};

export interface RoomData {
  room: Room | undefined;
  thread: Thread | null;
  messages: ChatMessage[];
  agents: Agent[];
  humans: RoomHuman[];
  merges: MergeInfo[];
  memory: { count: number; latest: string[] };
  ready: boolean;
}

const toAgent = (
  a: AgentRow,
  running: boolean,
  runningTool: string | undefined
): Agent => ({
  agentId: a.agentId,
  blurb: a.systemPrompt.slice(0, 72),
  currentJobStatus: running ? JobStatus.Running : undefined,
  currentTool: runningTool,
  handle: handleOf(a.name),
  modelName: a.modelName,
  modelProvider: a.modelProvider,
  name: a.name,
  presence: running ? "working" : "active",
  systemPrompt: a.systemPrompt,
  tools: [...a.tools],
  workspaceId: a.workspaceId,
});

export const useRoomData = (
  roomId: bigint,
  ticks: ReadonlyMap<string, StreamTick[]>
): RoomData => {
  const { identity } = useSpacetimeDB();
  const myHex = identity ? hexOf(identity) : "";

  const [roomRows, roomsReady] = useTable(
    tables.room.where((r) => r.roomId.eq(roomId))
  );
  const [threadRows, threadsReady] = useTable(
    tables.thread.where((t) => t.roomId.eq(roomId))
  );
  const [messageRows] = useTable(
    tables.message.where((m) => m.roomId.eq(roomId))
  );
  const [chunkRows] = useTable(tables.message_chunk);
  const [agentRows] = useTable(tables.agent);
  const [roomAgentRows] = useTable(
    tables.room_agent.where((r) => r.roomId.eq(roomId))
  );
  const [roomHumanRows] = useTable(
    tables.room_human.where((r) => r.roomId.eq(roomId))
  );
  const [userRows] = useTable(tables.app_user);
  const [presenceRows] = useTable(tables.room_presence);
  const [jobRows] = useTable(tables.ai_job.where((j) => j.roomId.eq(roomId)));
  const [toolRows] = useTable(tables.tool_call);
  const [sessionRows] = useTable(
    tables.merge_session.where((s) => s.roomId.eq(roomId))
  );
  const [explorationRows] = useTable(tables.exploration);
  const [memoryRows] = useTable(
    tables.room_memory_entry.where((m) => m.roomId.eq(roomId))
  );

  return useMemo(() => {
    const room = roomRows[0] ? toRoom(roomRows[0]) : undefined;
    const threadRow = pickActiveThread(threadRows);
    const thread = threadRow ? toThread(threadRow) : null;

    const users = new Map<string, AppUser>();
    for (const u of userRows) {
      users.set(hexOf(u.identity), u);
    }
    const presence = new Map<string, string>();
    for (const p of presenceRows) {
      presence.set(hexOf(p.identity), String(p.roomId));
    }

    const agentsById = new Map<bigint, AgentRow>();
    for (const a of agentRows) {
      agentsById.set(a.agentId, a);
    }
    const roomAgentIds = new Set(roomAgentRows.map((r) => r.agentId));

    const jobs = jobRows.toSorted((a, b) => (a.jobId < b.jobId ? 1 : -1));
    const latestJobByThread = new Map<string, (typeof jobs)[number]>();
    for (const j of jobs) {
      const key = String(j.threadId);
      if (!latestJobByThread.has(key)) {
        latestJobByThread.set(key, j);
      }
    }
    const toolsByJob = new Map<string, { status: number; tool: string }[]>();
    for (const t of toolRows) {
      const key = String(t.jobId);
      const list = toolsByJob.get(key) ?? [];
      list.push({ status: t.status, tool: t.tool });
      toolsByJob.set(key, list);
    }

    const agents: Agent[] = [...roomAgentIds]
      .map((id) => agentsById.get(id))
      .filter((a): a is AgentRow => Boolean(a))
      .map((a) => {
        const running = jobs.some(
          (j) => j.taggedAgent === a.agentId && j.status === JobStatus.Running
        );
        const runningTool = jobs
          .filter(
            (j) => j.taggedAgent === a.agentId && j.status === JobStatus.Running
          )
          .flatMap((j) => toolsByJob.get(String(j.jobId)) ?? [])
          .find((t) => t.status === 1)?.tool;
        return toAgent(a, running, runningTool);
      });

    const humans: RoomHuman[] = roomHumanRows.map((h) => {
      const hex = hexOf(h.identity);
      const user = users.get(hex);
      const inRoom = presence.get(hex) === String(roomId);
      const presRow = presenceRows.find((p) => hexOf(p.identity) === hex);
      const lastSeenMins =
        presRow === undefined
          ? Number.POSITIVE_INFINITY
          : Math.max(
              0,
              Math.round((Date.now() - microsOf(presRow.lastSeen)) / 60_000)
            );
      return {
        color: colorFor(hex),
        displayName: user?.displayName ?? `${hex.slice(0, 8)}…`,
        hex,
        identity: h.identity,
        isOnline: inRoom && presRow !== undefined && isFresh(presRow.lastSeen),
        isTyping: false,
        lastSeenMins,
        roleLabel: hex === myHex ? "you" : "member",
      };
    });

    const chunksByMessage = new Map<string, { delta: string; idx: number }[]>();
    for (const c of chunkRows) {
      const key = String(c.messageId);
      const list = chunksByMessage.get(key) ?? [];
      list.push({ delta: c.delta, idx: c.idx });
      chunksByMessage.set(key, list);
    }

    const messages: ChatMessage[] = messageRows
      .filter((m) => threadRow !== null && m.threadId === threadRow.threadId)
      .toSorted((a, b) => (a.messageId < b.messageId ? -1 : 1))
      .map((m) => {
        const hex = hexOf(m.author);
        const agent =
          m.authorAgent === undefined
            ? undefined
            : agentsById.get(m.authorAgent);
        const user = users.get(hex);
        const job =
          threadRow === null
            ? undefined
            : latestJobByThread.get(String(threadRow.threadId));
        const tool =
          job === undefined
            ? undefined
            : (toolsByJob.get(String(job.jobId)) ?? []).toSorted((a, b) =>
                a.tool < b.tool ? -1 : 1
              )[0];
        const toolCall: ToolCallInfo | undefined =
          tool === undefined
            ? undefined
            : {
                input: undefined,
                output: undefined,
                status: tool.status,
                tool: tool.tool,
              };
        return {
          author: m.author,
          authorAgent: m.authorAgent ?? null,
          authorColor: agent
            ? colorFor(`agent:${String(agent.agentId)}`)
            : colorFor(hex),
          authorHex: hex,
          authorName: agent
            ? agent.name
            : (user?.displayName ?? `${hex.slice(0, 8)}…`),
          body: m.body,
          chunks: (chunksByMessage.get(String(m.messageId)) ?? [])
            .toSorted((a, b) => a.idx - b.idx)
            .map((c) => ({ delta: c.delta, idx: c.idx })),
          createdAt: timeLabel(m.createdAt),
          jobStatus: job?.status,
          mentions: [...m.mentions],
          messageId: m.messageId,
          role: m.role,
          roomId: m.roomId,
          streaming: m.streaming,
          threadId: m.threadId,
          ticks: ticks.get(String(m.messageId)),
          toolCall,
        };
      });

    const explorationsBySession = new Map<
      string,
      { label: string; state: string }[]
    >();
    for (const e of explorationRows) {
      const key = String(e.sessionId);
      const list = explorationsBySession.get(key) ?? [];
      const state = explorationState(e.status);
      list.push({ label: e.angle || "General", state });
      explorationsBySession.set(key, list);
    }
    const merges: MergeInfo[] = [...sessionRows]
      .filter((s) => s.status === MergeStatus.Streaming)
      .map((s) => ({
        angles: explorationsBySession.get(String(s.sessionId)) ?? [],
        roomId: s.roomId,
        sessionId: s.sessionId,
        status: s.status,
      }));

    const memos = memoryRows.toSorted(byCreatedDesc);
    const memory = {
      count: memos.length,
      latest: memos.slice(0, 3).map((m) => m.summary),
    };

    return {
      agents,
      humans,
      memory,
      merges,
      messages,
      ready: roomsReady && threadsReady,
      room,
      thread,
    };
  }, [
    roomRows,
    roomsReady,
    threadRows,
    threadsReady,
    messageRows,
    chunkRows,
    agentRows,
    roomAgentRows,
    roomHumanRows,
    userRows,
    presenceRows,
    jobRows,
    toolRows,
    sessionRows,
    explorationRows,
    memoryRows,
    roomId,
    myHex,
    ticks,
  ]);
};

export const useSendMessage = (
  roomId: bigint,
  thread: Thread | null
): {
  send: (body: string, mentions: bigint[]) => void;
  armNewThread: () => void;
  newThreadArmed: boolean;
} => {
  const startThread = useReducer(reducers.startThread);
  const postMessage = useReducer(reducers.postMessage);
  const [freshArmed, setFreshArmed] = useState(false);

  const send = useCallback(
    (body: string, mentions: bigint[]) => {
      const usable =
        thread !== null &&
        (thread.status === ThreadStatus.Open ||
          thread.status === ThreadStatus.Streaming);
      const target = freshArmed || !usable ? null : thread;
      const run = async (): Promise<void> => {
        try {
          await (target === null
            ? startThread({
                angle: "",
                prompt: body,
                roomId,
                taggedAgent: mentions[0],
                title: body.slice(0, 60),
              })
            : postMessage({
                body,
                mentions,
                threadId: target.threadId,
              }));
        } catch (error) {
          console.error("send failed", error);
        }
      };
      void run();
      setFreshArmed(false);
    },
    [roomId, thread, freshArmed, startThread, postMessage]
  );

  const armNewThread = useCallback(() => {
    setFreshArmed(true);
  }, []);

  return { armNewThread, newThreadArmed: freshArmed, send };
};

export const useMyIdentity = (): { hex: string; identity: Identity | null } => {
  const { identity } = useSpacetimeDB();
  return useMemo(
    () => ({
      hex: identity ? hexOf(identity) : "",
      identity: identity ?? null,
    }),
    [identity]
  );
};

/** The caller's own profile row: live display name + rename. */
export const useMyProfile = (): {
  displayName: string;
  online: boolean;
  rename: (name: string) => void;
} => {
  const { identity, isActive } = useSpacetimeDB();
  const [users] = useTable(tables.app_user);
  const updateDisplayName = useReducer(reducers.updateDisplayName);

  const me = useMemo(() => {
    if (!identity) {
      return;
    }
    const hex = hexOf(identity);
    return users.find((u) => hexOf(u.identity) === hex);
  }, [users, identity]);

  const rename = useCallback(
    (name: string) => {
      const clean = name.trim().slice(0, 48);
      if (!clean) {
        return;
      }
      const run = async (): Promise<void> => {
        try {
          await updateDisplayName({ displayName: clean });
        } catch (error) {
          console.error("update_display_name failed", error);
        }
      };
      void run();
    },
    [updateDisplayName]
  );

  return {
    displayName:
      me?.displayName ?? (identity ? `${hexOf(identity).slice(0, 8)}…` : "…"),
    online: isActive,
    rename,
  };
};

export interface MemoryFact {
  roomId: bigint;
  roomName: string;
  summary: string;
}

/** Workspace-wide compounding memory: live count + latest facts. */
export const useWorkspaceMemory = (): {
  count: number;
  facts: MemoryFact[];
} => {
  const [entries] = useTable(tables.room_memory_entry);
  const [rooms] = useTable(tables.room);

  return useMemo(() => {
    const names = new Map<string, string>();
    for (const r of rooms) {
      names.set(String(r.roomId), r.name);
    }
    const facts = entries
      .toSorted(byCreatedDesc)
      .slice(0, 8)
      .map((e) => ({
        roomId: e.roomId,
        roomName: names.get(String(e.roomId)) ?? "archived room",
        summary: e.summary,
      }));
    return { count: entries.length, facts };
  }, [entries, rooms]);
};
