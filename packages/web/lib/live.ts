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
import { handleForName } from "./agent-handles";
import {
  attributeToolsToAgents,
  pickFinalAnswer,
  resolveWorkStatus,
  workPreview,
} from "./agent-process";
import { themeForHandle } from "./agent-theme";
import {
  JobStatus,
  MergeStatus,
  RoomStatus,
  ThreadStatus,
  hexOf,
} from "./room-types";
import type {
  Agent,
  AgentWork,
  ChatMessage,
  MergeBanner as MergeInfo,
  Room,
  RoomHuman,
  StreamTick,
  Thread,
  ThreadTimelineItem,
  ThreadView,
  ToolCallInfo,
} from "./room-types";
import { useSharedTables } from "./shared-tables";
import { useRoomUserStatus } from "./typing";

export {
  useRoomUserStatus,
  useTypingNotifier,
  useVoiceNotifier,
} from "./typing";

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

const handleOf = (name: string): string => handleForName(name);

/** Brand color for an agent row, keyed by its handle. */
const agentColorFor = (name: string): string =>
  themeForHandle(handleOf(name)).color;

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
  const { rooms: rows } = useSharedTables();
  const rooms = useMemo(
    () =>
      rows
        .filter((r) => r.status === RoomStatus.Active)
        .toSorted((a, b) => (a.roomId < b.roomId ? -1 : 1))
        .map(toRoom),
    [rows]
  );
  return { ready: true, rooms };
};

export const useRenameRoom = (): ((
  roomId: bigint,
  newName: string
) => void) => {
  const renameRoom = useReducer(reducers.renameRoom);
  return useCallback(
    (roomId: bigint, newName: string) => {
      const trimmed = newName.trim().slice(0, 200);
      if (!trimmed) {
        return;
      }
      try {
        void renameRoom({ name: trimmed, roomId });
      } catch (error) {
        console.error("rename_room failed", error);
      }
    },
    [renameRoom]
  );
};

export const useDeleteRoom = (): ((roomId: bigint) => Promise<void>) => {
  const archiveRoom = useReducer(reducers.archiveRoom);
  return useCallback(
    async (roomId: bigint) => {
      try {
        await archiveRoom({ roomId });
      } catch (error) {
        console.error("archive_room failed", error);
      }
    },
    [archiveRoom]
  );
};

export const usePresenceCounts = (): Record<string, number> => {
  const { presences: rows } = useSharedTables();
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
            memoryBackend: "honcho",
            memoryNamespace: `room-${crypto.randomUUID()}`,
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

export const useJoinRoom = (): ((roomId: bigint) => Promise<boolean>) => {
  const joinRoom = useReducer(reducers.joinRoom);
  return useCallback(
    async (roomId: bigint): Promise<boolean> => {
      try {
        await joinRoom({ roomId });
        return true;
      } catch (error) {
        console.error("join_room failed", error);
        return false;
      }
    },
    [joinRoom]
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

/**
 * Mark the current room as read once it becomes active and has finished
 * loading, so the unread divider clears for the viewer.
 */
export const useMarkRoomRead = (
  roomId: bigint,
  enabled: boolean,
  ready: boolean
): void => {
  const markRoomRead = useReducer(reducers.markRoomRead);
  useEffect(() => {
    if (!enabled || !ready) {
      return;
    }
    const t = setTimeout(() => {
      try {
        void markRoomRead({ roomId });
      } catch (error) {
        console.error("mark_room_read failed", error);
      }
    }, 600);
    return () => {
      clearTimeout(t);
    };
  }, [roomId, enabled, ready, markRoomRead]);
};

/**
 * Read a `?room=<id>` invite link from the URL. On first mount, the
 * guest is joined to that room (idempotent) and the id is returned so
 * the shell can select it. Returns null when there is no invite.
 */
export const useJoinByLink = (): bigint | null => {
  const joinRoom = useReducer(reducers.joinRoom);
  const [inviteId, setInviteId] = useState<bigint | null>(null);
  const handled = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || handled.current) {
      return;
    }
    const raw = new URLSearchParams(window.location.search).get("room");
    if (!raw) {
      return;
    }
    const id = BigInt(raw);
    if (Number.isNaN(Number(raw)) || id <= 0n) {
      return;
    }
    handled.current = true;
    setInviteId(id);
    const join = async (): Promise<void> => {
      try {
        await joinRoom({ roomId: id });
      } catch (error) {
        console.error("join_room failed", error);
      }
    };
    void join();
  }, [joinRoom]);

  return inviteId;
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
        kind !== "tool_end" &&
        kind !== "memory_used"
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
  generalThread: Thread | undefined;
  threads: Thread[];
  threadSummaries: Map<string, ThreadView>;
  messages: ChatMessage[];
  agents: Agent[];
  humans: RoomHuman[];
  merges: MergeInfo[];
  memory: { count: number; latest: string[] };
  jobs: { taggedAgent?: bigint; status: number; threadId: bigint }[];
  /** Id of the first message not yet read by this user, if any. */
  firstUnreadId: bigint | null;
  ready: boolean;
}

const toAgent = (
  a: AgentRow,
  running: boolean,
  runningTool: string | undefined
): Agent => {
  const handle = handleOf(a.name);
  const theme = themeForHandle(handle);
  return {
    agentId: a.agentId,
    blurb: a.systemPrompt.slice(0, 72),
    color: theme.color,
    currentJobStatus: running ? JobStatus.Running : undefined,
    currentTool: runningTool,
    handle,
    icon: theme.icon,
    modelName: a.modelName,
    modelProvider: a.modelProvider,
    name: a.name,
    presence: running ? "working" : "idle",
    systemPrompt: a.systemPrompt,
    tools: [...a.tools],
    workspaceId: a.workspaceId,
  };
};

const buildHumans = (
  roomHumanRows: readonly { identity: Identity }[],
  users: Map<string, AppUser>,
  presenceRows: readonly {
    identity: Identity;
    lastSeen: { microsSinceUnixEpoch: bigint };
  }[],
  roomId: bigint,
  myHex: string,
  presence: Map<string, string>,
  typingIdentities?: Set<string>,
  voiceIdentities?: Set<string>
): RoomHuman[] =>
  roomHumanRows.map((h) => {
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
      isSpeaking: hex !== myHex && Boolean(voiceIdentities?.has(hex)),
      isTyping: hex !== myHex && Boolean(typingIdentities?.has(hex)),
      lastSeenMins,
      roleLabel: hex === myHex ? "you" : "member",
    };
  });

const buildThreadSummaries = (
  threadRows: readonly ThreadRow[],
  messageRows: readonly {
    authorAgent?: bigint;
    messageId: bigint;
    roomId: bigint;
    streaming: boolean;
    threadId: bigint;
  }[],
  agentsById: Map<bigint, AgentRow>
): Map<string, ThreadView> => {
  const summaries = new Map<string, ThreadView>();
  const messagesByThread = new Map<string, (typeof messageRows)[number][]>();
  for (const m of messageRows) {
    const key = String(m.threadId);
    const list = messagesByThread.get(key) ?? [];
    list.push(m);
    messagesByThread.set(key, list);
  }

  for (const t of threadRows) {
    const key = String(t.threadId);
    const list = messagesByThread.get(key) ?? [];
    const replyCount = Math.max(0, list.length - 1);
    const agentMsgs = list.filter((m) => m.authorAgent !== undefined);
    const lastAgentId = agentMsgs.at(-1)?.authorAgent;
    const lastAgent =
      lastAgentId === undefined ? undefined : agentsById.get(lastAgentId);
    const isStreaming = list.some((m) => m.streaming);
    summaries.set(key, {
      lastAgentName: lastAgent?.name,
      replyCount,
      streaming: isStreaming,
      thread: toThread(t),
    });
  }
  return summaries;
};

export interface ToolEntry {
  callId: bigint;
  input?: string;
  output?: string;
  status: number;
  tool: string;
  createdAtMicros: bigint;
}

const toToolInfo = (t: ToolEntry): ToolCallInfo => ({
  callId: t.callId,
  createdAtMicros: t.createdAtMicros,
  input: t.input,
  output: t.output,
  status: t.status,
  tool: t.tool,
});

const toToolEntries = (
  toolRows: readonly {
    callId: bigint;
    createdAt: { microsSinceUnixEpoch: bigint };
    input: string;
    jobId: bigint;
    output?: string | null;
    status: number;
    tool: string;
  }[]
): Map<string, ToolEntry[]> => {
  const byJob = new Map<string, ToolEntry[]>();
  for (const t of toolRows) {
    const key = String(t.jobId);
    const list = byJob.get(key) ?? [];
    list.push({
      callId: t.callId,
      createdAtMicros: t.createdAt.microsSinceUnixEpoch,
      input: t.input,
      output: t.output ?? undefined,
      status: t.status,
      tool: t.tool,
    });
    byJob.set(key, list);
  }
  for (const list of byJob.values()) {
    list.sort((a, b) => (a.callId < b.callId ? -1 : 1));
  }
  return byJob;
};

const groupToolsByThread = <J extends { jobId: bigint; threadId: bigint }>(
  toolsByJob: ReadonlyMap<string, ToolEntry[]>,
  jobs: readonly J[]
): Map<string, ToolEntry[]> => {
  const byId = new Map<string, J>();
  for (const j of jobs) {
    byId.set(String(j.jobId), j);
  }
  const byThread = new Map<string, ToolEntry[]>();
  for (const [jobKey, entries] of toolsByJob) {
    const job = byId.get(jobKey);
    if (!job) {
      continue;
    }
    const key = String(job.threadId);
    const list = byThread.get(key) ?? [];
    list.push(...entries);
    byThread.set(key, list);
  }
  for (const list of byThread.values()) {
    list.sort((a, b) => (a.callId < b.callId ? -1 : 1));
  }
  return byThread;
};

/**
 * Pick the badge tool: a running call first, then failed, else the newest
 * completed one. A job can fan out to several tools (web + market +
 * evaluation) so the UI needs one primary plus the full list.
 */
const pickPrimaryTool = (tools: ToolEntry[]): ToolEntry | undefined => {
  if (tools.length === 0) {
    return undefined;
  }
  const [running] = tools
    .filter((t) => t.status === 1)
    .toSorted((a, b) => (a.callId < b.callId ? -1 : 1));
  if (running) {
    return running;
  }
  const [failed] = tools
    .filter((t) => t.status === 3)
    .toSorted((a, b) => (a.callId < b.callId ? 1 : -1));
  if (failed) {
    return failed;
  }
  const [newest] = tools.toSorted((a, b) => (a.callId < b.callId ? 1 : -1));
  return newest;
};

const buildChatMessages = (
  messageRows: readonly {
    author: Identity;
    authorAgent?: bigint;
    body: string;
    createdAt: { microsSinceUnixEpoch: bigint };
    mentions: readonly bigint[];
    messageId: bigint;
    role: number;
    roomId: bigint;
    streaming: boolean;
    threadId: bigint;
  }[],
  agentsById: Map<bigint, AgentRow>,
  users: Map<string, AppUser>,
  latestJobByThread: Map<string, { jobId: bigint; status: number }>,
  toolsByThread: Map<string, ToolEntry[]>,
  chunksByMessage: Map<string, { delta: string; idx: number }[]>,
  ticks: ReadonlyMap<string, StreamTick[]>,
  attachmentsByMessage: Map<string, { data: string; mime: string }[]>
): ChatMessage[] =>
  messageRows
    .toSorted((a, b) => (a.messageId < b.messageId ? -1 : 1))
    .map((m) => {
      const hex = hexOf(m.author);
      const agent =
        m.authorAgent === undefined ? undefined : agentsById.get(m.authorAgent);
      const user = users.get(hex);
      const job = latestJobByThread.get(String(m.threadId));
      // Tools belong to agent replies, never to user prompts. A thread can
      // hold several jobs (steering), so attach every tool logged for the
      // thread to keep input/output visible instead of dropping them.
      const threadTools =
        m.authorAgent === undefined
          ? []
          : (toolsByThread.get(String(m.threadId)) ?? []).toSorted((a, b) =>
              a.callId < b.callId ? -1 : 1
            );
      const primary = pickPrimaryTool(threadTools);
      const toolCall: ToolCallInfo | undefined =
        primary === undefined ? undefined : toToolInfo(primary);
      const toolCalls: ToolCallInfo[] | undefined =
        threadTools.length === 0 ? undefined : threadTools.map(toToolInfo);
      return {
        author: m.author,
        authorAgent: m.authorAgent ?? null,
        authorColor: agent ? agentColorFor(agent.name) : colorFor(hex),
        authorHex: hex,
        authorName: agent
          ? agent.name
          : (user?.displayName ?? `${hex.slice(0, 8)}…`),
        body: m.body,
        chunks: (chunksByMessage.get(String(m.messageId)) ?? [])
          .toSorted((a, b) => a.idx - b.idx)
          .map((c) => ({ delta: c.delta, idx: c.idx })),
        createdAt: timeLabel(m.createdAt),
        createdAtMicros: m.createdAt.microsSinceUnixEpoch,
        images: attachmentsByMessage.get(String(m.messageId)),
        jobStatus: job?.status,
        mentions: [...m.mentions],
        messageId: m.messageId,
        role: m.role,
        roomId: m.roomId,
        streaming: m.streaming,
        threadId: m.threadId,
        ticks: ticks.get(String(m.messageId)),
        toolCall,
        toolCalls,
      };
    });

const buildRoomAgents = (
  roomAgentRows: readonly { agentId: bigint }[],
  agentsById: ReadonlyMap<bigint, AgentRow>,
  jobs: readonly {
    jobId: bigint;
    status: number;
    taggedAgent: bigint | null | undefined;
  }[],
  toolsByJob: ReadonlyMap<string, ToolEntry[]>
): Agent[] => {
  const roomAgentIds = new Set(roomAgentRows.map((r) => r.agentId));
  // Tools currently executing anywhere in this room. When the Neb orchestrator
  // fans out, its running sub-agent tools appear here so each specialist shows
  // as "working" in the sidebar for its own stage.
  const runningTools = new Set<string>();
  for (const j of jobs) {
    if (j.status !== JobStatus.Running) {
      continue;
    }
    for (const t of toolsByJob.get(String(j.jobId)) ?? []) {
      if (t.status === 1) {
        runningTools.add(t.tool);
      }
    }
  }

  return [...roomAgentIds]
    .map((id) => agentsById.get(id))
    .filter((a): a is AgentRow => Boolean(a))
    .map((a) => {
      const taggedRunning = jobs.some(
        (j) => j.taggedAgent === a.agentId && j.status === JobStatus.Running
      );
      const runningTool = a.tools.find((tool) => runningTools.has(tool));
      const running = taggedRunning || runningTool !== undefined;
      return toAgent(a, running, runningTool);
    });
};

/**
 * Resolve the viewer's read cursor for a room, then the first unread message
 * id. Returns null when nothing is unread or no marker exists yet.
 */
const firstUnreadIn = (
  messages: readonly { messageId: bigint }[],
  readStateRows: readonly {
    identity: Identity;
    lastReadMessageId: bigint;
    roomId: bigint;
  }[],
  roomId: bigint,
  myHex: string
): bigint | null => {
  let lastRead = 0n;
  for (const r of readStateRows) {
    if (
      r.roomId === roomId &&
      r.identity.toHexString() === myHex &&
      r.lastReadMessageId > lastRead
    ) {
      lastRead = r.lastReadMessageId;
    }
  }
  if (lastRead === 0n) {
    return null;
  }
  const next = messages.find((m) => m.messageId > lastRead);
  return next ? next.messageId : null;
};

export const useRoomData = (
  roomId: bigint,
  ticks: ReadonlyMap<string, StreamTick[]>
): RoomData => {
  const { identity } = useSpacetimeDB();
  const myHex = identity ? hexOf(identity) : "";
  const {
    agents: agentRows,
    attachments: attachmentRows,
    chunks: chunkRows,
    explorations: explorationRows,
    memories: memoryRows,
    presences: presenceRows,
    roomReadStates: readStateRows,
    toolCalls: toolRows,
    users: userRows,
  } = useSharedTables();

  const [roomRows, roomsReady] = useTable(
    tables.room.where((r) => r.roomId.eq(roomId))
  );
  const [threadRows, threadsReady] = useTable(
    tables.thread.where((t) => t.roomId.eq(roomId))
  );
  const [messageRows] = useTable(
    tables.message.where((m) => m.roomId.eq(roomId))
  );
  const [roomAgentRows] = useTable(
    tables.room_agent.where((r) => r.roomId.eq(roomId))
  );
  const [roomHumanRows] = useTable(
    tables.room_human.where((r) => r.roomId.eq(roomId))
  );
  const [jobRows] = useTable(tables.ai_job.where((j) => j.roomId.eq(roomId)));
  const [sessionRows] = useTable(
    tables.merge_session.where((s) => s.roomId.eq(roomId))
  );

  const { typingIdentities, voiceIdentities } = useRoomUserStatus(
    roomId,
    myHex
  );

  return useMemo(() => {
    const room = roomRows[0] ? toRoom(roomRows[0]) : undefined;
    const threadRow = pickActiveThread(threadRows);
    const thread = threadRow ? toThread(threadRow) : null;
    // Every thread in the room, newest first — the view renders all of
    // them so no conversation can silently disappear.
    const threads = threadRows.toSorted(byCreatedDesc).map(toThread);

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

    const jobs = jobRows.toSorted((a, b) => (a.jobId < b.jobId ? 1 : -1));
    const latestJobByThread = new Map<string, (typeof jobs)[number]>();
    for (const j of jobs) {
      const key = String(j.threadId);
      if (!latestJobByThread.has(key)) {
        latestJobByThread.set(key, j);
      }
    }
    const toolsByJob = toToolEntries(toolRows);
    // Thread -> every tool logged for it (across steering turns), oldest first.
    const toolsByThread = groupToolsByThread(toolsByJob, jobs);

    const agents = buildRoomAgents(roomAgentRows, agentsById, jobs, toolsByJob);

    const humans = buildHumans(
      roomHumanRows,
      users,
      presenceRows,
      roomId,
      myHex,
      presence,
      typingIdentities,
      voiceIdentities
    );

    const chunksByMessage = new Map<string, { delta: string; idx: number }[]>();
    for (const c of chunkRows) {
      const key = String(c.messageId);
      const list = chunksByMessage.get(key) ?? [];
      list.push({ delta: c.delta, idx: c.idx });
      chunksByMessage.set(key, list);
    }

    const threadSummaries = buildThreadSummaries(
      threadRows,
      messageRows,
      agentsById
    );

    const attachmentsByMessage = new Map<
      string,
      { data: string; mime: string }[]
    >();
    for (const att of attachmentRows) {
      const key = String(att.messageId);
      const list = attachmentsByMessage.get(key) ?? [];
      list.push({ data: att.data, mime: att.mime });
      attachmentsByMessage.set(key, list);
    }

    const messages = buildChatMessages(
      messageRows,
      agentsById,
      users,
      latestJobByThread,
      toolsByThread,
      chunksByMessage,
      ticks,
      attachmentsByMessage
    );

    // Read cursor for this user in this room, if recorded.
    const firstUnreadId = firstUnreadIn(messages, readStateRows, roomId, myHex);

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

    const generalThread =
      threads.find(
        (t) =>
          t.title === "General" ||
          (room?.name !== undefined && t.title === room.name)
      ) ?? undefined;

    return {
      agents,
      firstUnreadId,
      generalThread,
      humans,
      jobs: jobs.map((j) => ({
        status: j.status,
        taggedAgent: j.taggedAgent,
        threadId: j.threadId,
      })),
      memory,
      merges,
      messages,
      ready: roomsReady && threadsReady,
      room,
      thread,
      threadSummaries,
      threads,
    };
  }, [
    roomRows,
    roomsReady,
    threadRows,
    threadsReady,
    messageRows,
    chunkRows,
    agentRows,
    attachmentRows,
    roomAgentRows,
    roomHumanRows,
    userRows,
    presenceRows,
    jobRows,
    toolRows,
    sessionRows,
    explorationRows,
    memoryRows,
    readStateRows,
    roomId,
    myHex,
    ticks,
    typingIdentities,
    voiceIdentities,
  ]);
};

export interface ThreadDetails {
  thread: Thread | undefined;
  originMessage: ChatMessage | undefined;
  steeringNotices: ChatMessage[];
  agentWork: AgentWork[];
  /** Latest agent reply — rendered outside the process dropdowns. */
  finalAnswer: ChatMessage | undefined;
  /** The thread as one unified, time-ordered timeline (steers + replies + tool calls). */
  timeline: ThreadTimelineItem[];
  allMessages: ChatMessage[];
  ready: boolean;
}

export const useThreadDetails = (
  threadId: bigint | null,
  roomId: bigint,
  agents: Agent[],
  ticks: ReadonlyMap<string, StreamTick[]>
): ThreadDetails => {
  const {
    chunks: chunkRows,
    toolCalls: toolRows,
    users: userRows,
  } = useSharedTables();
  const [threadRows, threadsReady] = useTable(
    threadId === null
      ? tables.thread.where((t) => t.roomId.eq(roomId))
      : tables.thread.where((t) => t.threadId.eq(threadId))
  );
  const [messageRows, msgsReady] = useTable(
    threadId === null
      ? tables.message.where((m) => m.roomId.eq(roomId))
      : tables.message.where((m) => m.threadId.eq(threadId))
  );
  const [jobRows] = useTable(
    threadId === null
      ? tables.ai_job.where((j) => j.roomId.eq(roomId))
      : tables.ai_job.where((j) => j.threadId.eq(threadId))
  );

  return useMemo(() => {
    if (threadId === null) {
      return {
        agentWork: [],
        allMessages: [],
        finalAnswer: undefined,
        originMessage: undefined,
        ready: false,
        steeringNotices: [],
        thread: undefined,
        timeline: [],
      };
    }

    const threadRow = threadRows.find((t) => t.threadId === threadId);
    const thread = threadRow ? toThread(threadRow) : undefined;

    const users = new Map<string, AppUser>();
    for (const u of userRows) {
      users.set(hexOf(u.identity), u);
    }

    const chunksByMessage = new Map<string, { delta: string; idx: number }[]>();
    for (const c of chunkRows) {
      const key = String(c.messageId);
      const list = chunksByMessage.get(key) ?? [];
      list.push({ delta: c.delta, idx: c.idx });
      chunksByMessage.set(key, list);
    }

    const toolsByJob = toToolEntries(toolRows);
    // All tools for this thread (every job in it), oldest first. tool_call
    // rows only carry job_id, so thread scope is the finest join we have.
    const threadTools: ToolEntry[] = [...toolsByJob.values()]
      .flat()
      .toSorted((a, b) => (a.callId < b.callId ? -1 : 1));

    const allMessages: ChatMessage[] = messageRows
      .filter((m) => m.threadId === threadId)
      .toSorted((a, b) => (a.messageId < b.messageId ? -1 : 1))
      .map((m) => {
        const hex = hexOf(m.author);
        const agent =
          m.authorAgent === undefined
            ? undefined
            : agents.find((a) => a.agentId === m.authorAgent);
        const user = users.get(hex);
        const mine = m.authorAgent === undefined ? [] : threadTools;
        const primary = pickPrimaryTool(mine);
        return {
          author: m.author,
          authorAgent: m.authorAgent ?? null,
          authorColor: agent ? agent.color : colorFor(hex),
          authorHex: hex,
          authorName: agent
            ? agent.name
            : (user?.displayName ?? `${hex.slice(0, 8)}…`),
          body: m.body,
          chunks: (chunksByMessage.get(String(m.messageId)) ?? [])
            .toSorted((a, b) => a.idx - b.idx)
            .map((c) => ({ delta: c.delta, idx: c.idx })),
          createdAt: timeLabel(m.createdAt),
          createdAtMicros: m.createdAt.microsSinceUnixEpoch,
          jobStatus: undefined,
          mentions: [...m.mentions],
          messageId: m.messageId,
          role: m.role,
          roomId: m.roomId,
          streaming: m.streaming,
          threadId: m.threadId,
          ticks: ticks.get(String(m.messageId)),
          toolCall: primary === undefined ? undefined : toToolInfo(primary),
          toolCalls: mine.length === 0 ? undefined : mine.map(toToolInfo),
        };
      });

    const originMessage = allMessages.find((m) => m.role === 0);
    const steeringNotices = allMessages.filter(
      (m) => m.role === 0 && m.messageId !== originMessage?.messageId
    );

    const jobs = jobRows.filter((j) => j.threadId === threadId);

    // Sub-agents surface only as tool_call rows, so attribute the thread's
    // tools to agents via their tools[] — otherwise orchestrated specialists
    // never appear in the thread at all.
    const threadToolInfos = threadTools.map(toToolInfo);
    const toolsByAgent = attributeToolsToAgents(agents, threadToolInfos);
    // The final reply lives outside the process dropdowns; tabs show process
    // plus earlier messages only.
    const finalAnswer = pickFinalAnswer(allMessages);

    // Build one work tab per agent that actually ran in this thread: tagged,
    // replied, or left tool calls behind. Idle agents are omitted entirely.
    const agentWork: AgentWork[] = agents
      .map((agent) => {
        const key = String(agent.agentId);
        const agentTools = toolsByAgent.get(key) ?? [];
        const agentMsgs = allMessages.filter(
          (m) =>
            m.authorAgent === agent.agentId &&
            (finalAnswer === undefined || m.messageId !== finalAnswer.messageId)
        );
        const agentJobs = jobs.filter(
          (j) => j.taggedAgent === agent.agentId || j.taggedAgent === undefined
        );

        const status = resolveWorkStatus({
          hasMessages: agentMsgs.length > 0,
          hasStreamingMessage: agentMsgs.some((m) => m.streaming),
          jobStatuses: agentJobs.map((j) => j.status),
          toolStatuses: agentTools.map((t) => t.status),
        });

        const lastMsg = agentMsgs.at(-1);
        const preview = workPreview({
          lastMessageText:
            lastMsg === undefined
              ? undefined
              : lastMsg.body || lastMsg.chunks.map((c) => c.delta).join(""),
          status,
          tools: agentTools,
        });

        return {
          agent,
          jobs: agentJobs.map((j) => ({
            angle: j.angle,
            jobId: j.jobId,
            prompt: j.prompt,
            status: j.status,
            taggedAgent: j.taggedAgent,
          })),
          messages: agentMsgs,
          preview,
          status,
          tools: agentTools,
        };
      })
      .filter((work) => work.status !== "idle");

    // Build one unified, time-ordered timeline: messages (steers + replies)
    // and tool-call progress steps sorted together by their real timestamps,
    // so progress shows inline in the order it actually happened.
    const toolToAgent = new Map<string, Agent>();
    for (const a of agents) {
      for (const tool of a.tools) {
        toolToAgent.set(tool, a);
      }
    }
    const items: ThreadTimelineItem[] = [
      ...allMessages.map((m): ThreadTimelineItem => ({
        kind: "message",
        msg: m,
      })),
      ...threadTools.map((t): ThreadTimelineItem => ({
        agent: toolToAgent.get(t.tool),
        kind: "tool",
        tool: toToolInfo(t),
      })),
    ];
    items.sort((a, b) => {
      const am =
        a.kind === "message" ? a.msg.createdAtMicros : a.tool.createdAtMicros;
      const bm =
        b.kind === "message" ? b.msg.createdAtMicros : b.tool.createdAtMicros;
      if (am === undefined || bm === undefined || am === bm) {
        return 0;
      }
      return am < bm ? -1 : 1;
    });

    return {
      agentWork,
      allMessages,
      finalAnswer,
      originMessage,
      ready: threadsReady && msgsReady,
      steeringNotices,
      thread,
      timeline: items,
    };
  }, [
    threadId,
    threadRows,
    threadsReady,
    messageRows,
    msgsReady,
    chunkRows,
    jobRows,
    toolRows,
    userRows,
    agents,
    ticks,
  ]);
};

export interface BusyNotice {
  agentName: string;
  agentHandle: string;
  threadId?: bigint;
  message: string;
}

export interface ImageUpload {
  data: string;
  mime: string;
}

export const useSendMessage = (
  roomId: bigint,
  generalThread: Thread | undefined,
  agents: Agent[],
  activeJobs: { taggedAgent?: bigint; status: number; threadId: bigint }[]
): {
  armNewThread: () => void;
  busyNotice: BusyNotice | null;
  clearBusyNotice: () => void;
  newThreadArmed: boolean;
  send: (
    body: string,
    mentions: bigint[],
    model?: string,
    images?: ImageUpload[]
  ) => void;
} => {
  const startThread = useReducer(reducers.startThread);
  const postMessage = useReducer(reducers.postMessage);

  const [freshArmed, setFreshArmed] = useState(false);
  const [busyNotice, setBusyNotice] = useState<BusyNotice | null>(null);

  const clearBusyNotice = useCallback(() => {
    setBusyNotice(null);
  }, []);

  const send = useCallback(
    (
      body: string,
      mentions: bigint[],
      model?: string,
      images?: ImageUpload[]
    ) => {
      setBusyNotice(null);
      const attachments = images ?? [];
      const trimmed = body.trim();
      if (!trimmed && attachments.length === 0) {
        return;
      }
      // Reducers require a non-empty prompt; use a placeholder when only
      // images are attached.
      const prompt =
        trimmed.length > 0
          ? trimmed
          : "Please analyze the attached image(s) and describe what you see.";

      // 1. User mentioned an agent: only mentions spin up an agent thread
      if (mentions.length > 0) {
        const [taggedId] = mentions;
        const taggedAgent = agents.find((a) => a.agentId === taggedId);

        const isBusy =
          taggedAgent?.presence === "working" ||
          activeJobs.some(
            (j) =>
              j.taggedAgent === taggedId &&
              (j.status === JobStatus.Running || j.status === JobStatus.Queued)
          );

        if (isBusy) {
          const activeJob = activeJobs.find(
            (j) =>
              j.taggedAgent === taggedId &&
              (j.status === JobStatus.Running || j.status === JobStatus.Queued)
          );
          const handle = taggedAgent?.handle ?? "agent";
          setBusyNotice({
            agentHandle: handle,
            agentName: taggedAgent?.name ?? "Agent",
            message: "The agents are busy, you can steer them in thread.",
            threadId: activeJob?.threadId,
          });
          return;
        }

        // Agent is free -> spin up a new thread with this agent
        const run = async (): Promise<void> => {
          try {
            await startThread({
              angle: "",
              images: attachments,
              model,
              prompt,
              roomId,
              taggedAgent: taggedId,
              title: prompt.slice(0, 60),
            });
          } catch (error) {
            console.error("start_thread failed", error);
          }
        };
        void run();
        setFreshArmed(false);
        return;
      }

      // 2. User did not mention any agent
      // If user explicitly pressed [+] "Start new thread" button
      if (freshArmed) {
        const run = async (): Promise<void> => {
          try {
            await startThread({
              angle: "",
              images: attachments,
              model,
              prompt,
              roomId,
              taggedAgent: undefined,
              title: prompt.slice(0, 60),
            });
          } catch (error) {
            console.error("start_thread failed", error);
          }
        };
        void run();
        setFreshArmed(false);
        return;
      }

      // Post regular room chat message without creating a thread
      if (generalThread) {
        const run = async (): Promise<void> => {
          try {
            await postMessage({
              body: prompt,
              images: attachments,
              mentions: [],
              model,
              threadId: generalThread.threadId,
            });
          } catch (error) {
            console.error("post_message failed", error);
          }
        };
        void run();
        return;
      }

      // Initialize base general thread if none exists yet
      const run = async (): Promise<void> => {
        try {
          await startThread({
            angle: "",
            images: attachments,
            model,
            prompt,
            roomId,
            taggedAgent: undefined,
            title: "General",
          });
        } catch (error) {
          console.error("start_thread failed", error);
        }
      };
      void run();
    },
    [
      roomId,
      generalThread,
      agents,
      activeJobs,
      freshArmed,
      startThread,
      postMessage,
    ]
  );

  const armNewThread = useCallback(() => {
    setFreshArmed(true);
  }, []);

  return {
    armNewThread,
    busyNotice,
    clearBusyNotice,
    newThreadArmed: freshArmed,
    send,
  };
};

export const useSteerThread = (
  threadId: bigint | null
): ((
  body: string,
  mentions: bigint[],
  model?: string,
  images?: ImageUpload[]
) => void) => {
  const postMessage = useReducer(reducers.postMessage);
  return useCallback(
    (
      body: string,
      mentions: bigint[],
      model?: string,
      images?: ImageUpload[]
    ) => {
      if (threadId === null) {
        return;
      }
      const run = async (): Promise<void> => {
        try {
          await postMessage({
            body,
            images: images ?? [],
            mentions,
            model,
            threadId,
          });
        } catch (error) {
          console.error("post_message steer failed", error);
        }
      };
      void run();
    },
    [threadId, postMessage]
  );
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
  identityHex: string;
  online: boolean;
  rename: (name: string) => void;
} => {
  const { identity, isActive } = useSpacetimeDB();
  const { users } = useSharedTables();
  const updateDisplayName = useReducer(reducers.updateDisplayName);

  const hex = identity ? hexOf(identity) : "";
  const me = useMemo(() => {
    if (!hex) {
      return;
    }
    return users.find((u) => hexOf(u.identity) === hex);
  }, [users, hex]);

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
    displayName: me?.displayName ?? (hex ? `${hex.slice(0, 8)}…` : "…"),
    identityHex: hex,
    online: isActive,
    rename,
  };
};
