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
  AgentWork,
  ChatMessage,
  MergeBanner as MergeInfo,
  Room,
  RoomHuman,
  StreamTick,
  Thread,
  ThreadView,
  ToolCallInfo,
} from "./room-types";
import { useSharedTables } from "./shared-tables";
import { useTypingStatus } from "./typing";

export { useTypingNotifier, useTypingStatus } from "./typing";

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

const ROOM_NAMES_KEY = "nebula:room-names";

export const getCustomRoomName = (roomId: bigint): string | undefined => {
  if (typeof window === "undefined") {
    return undefined;
  }
  try {
    const raw = window.localStorage.getItem(ROOM_NAMES_KEY);
    if (!raw) {
      return undefined;
    }
    const map = JSON.parse(raw) as Record<string, string>;
    return map[String(roomId)] || undefined;
  } catch {
    return undefined;
  }
};

export const setCustomRoomName = (roomId: bigint, name: string): void => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const raw = window.localStorage.getItem(ROOM_NAMES_KEY);
    const map = (raw ? JSON.parse(raw) : {}) as Record<string, string>;
    map[String(roomId)] = name;
    window.localStorage.setItem(ROOM_NAMES_KEY, JSON.stringify(map));
    window.dispatchEvent(
      new CustomEvent("nebula:room-renamed", {
        detail: { name, roomId: String(roomId) },
      })
    );
  } catch (error) {
    console.error("setCustomRoomName failed", error);
  }
};

export const deleteCustomRoomName = (roomId: bigint): void => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const raw = window.localStorage.getItem(ROOM_NAMES_KEY);
    if (!raw) {
      return;
    }
    const map = JSON.parse(raw) as Record<string, string>;
    const targetKey = String(roomId);
    const filtered = Object.fromEntries(
      Object.entries(map).filter(([k]) => k !== targetKey)
    );
    window.localStorage.setItem(ROOM_NAMES_KEY, JSON.stringify(filtered));
    window.dispatchEvent(
      new CustomEvent("nebula:room-renamed", {
        detail: { roomId: String(roomId) },
      })
    );
  } catch (error) {
    console.error("deleteCustomRoomName failed", error);
  }
};

const toRoom = (r: RoomRow): Room => ({
  canvasX: r.canvasX,
  canvasY: r.canvasY,
  memoryBackend: r.memoryBackend === "honcho" ? "honcho" : "hindsight",
  memoryNamespace: r.memoryNamespace,
  name: getCustomRoomName(r.roomId) ?? r.name,
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
  const [renameVer, setRenameVer] = useState(0);

  useEffect(() => {
    const handleRename = () => setRenameVer((v) => v + 1);
    window.addEventListener("nebula:room-renamed", handleRename);
    window.addEventListener("storage", handleRename);
    return () => {
      window.removeEventListener("nebula:room-renamed", handleRename);
      window.removeEventListener("storage", handleRename);
    };
  }, []);
  const rooms = useMemo(
    () =>
      rows
        .filter((r) => r.status === RoomStatus.Active)
        .toSorted((a, b) => (a.roomId < b.roomId ? -1 : 1))
        .map(toRoom),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, renameVer]
  );
  return { ready: true, rooms };
};

export const useRenameRoom = (): ((roomId: bigint, newName: string) => void) =>
  useCallback((roomId: bigint, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) {
      return;
    }
    setCustomRoomName(roomId, trimmed);
  }, []);

export const useDeleteRoom = (): ((roomId: bigint) => Promise<void>) => {
  const archiveRoom = useReducer(reducers.archiveRoom);
  return useCallback(
    async (roomId: bigint) => {
      try {
        deleteCustomRoomName(roomId);
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
  presence: running ? "working" : "idle",
  systemPrompt: a.systemPrompt,
  tools: [...a.tools],
  workspaceId: a.workspaceId,
});

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
  typingIdentities?: Set<string>
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
      isTyping: Boolean(typingIdentities?.has(hex)),
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
  toolsByJob: Map<string, { status: number; tool: string }[]>,
  chunksByMessage: Map<string, { delta: string; idx: number }[]>,
  ticks: ReadonlyMap<string, StreamTick[]>
): ChatMessage[] =>
  messageRows
    .toSorted((a, b) => (a.messageId < b.messageId ? -1 : 1))
    .map((m) => {
      const hex = hexOf(m.author);
      const agent =
        m.authorAgent === undefined ? undefined : agentsById.get(m.authorAgent);
      const user = users.get(hex);
      const job = latestJobByThread.get(String(m.threadId));
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

const buildRoomAgents = (
  roomAgentRows: readonly { agentId: bigint }[],
  agentsById: ReadonlyMap<bigint, AgentRow>,
  jobs: readonly {
    jobId: bigint;
    status: number;
    taggedAgent: bigint | null | undefined;
  }[],
  toolsByJob: ReadonlyMap<string, { status: number; tool: string }[]>
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

export const useRoomData = (
  roomId: bigint,
  ticks: ReadonlyMap<string, StreamTick[]>
): RoomData => {
  const { identity } = useSpacetimeDB();
  const myHex = identity ? hexOf(identity) : "";
  const {
    agents: agentRows,
    chunks: chunkRows,
    explorations: explorationRows,
    memories: memoryRows,
    presences: presenceRows,
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

  const [renameVer, setRenameVer] = useState(0);

  useEffect(() => {
    const handleRename = () => setRenameVer((v) => v + 1);
    window.addEventListener("nebula:room-renamed", handleRename);
    window.addEventListener("storage", handleRename);
    return () => {
      window.removeEventListener("nebula:room-renamed", handleRename);
      window.removeEventListener("storage", handleRename);
    };
  }, []);

  const { typingIdentities } = useTypingStatus(roomId);

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
    const toolsByJob = new Map<string, { status: number; tool: string }[]>();
    for (const t of toolRows) {
      const key = String(t.jobId);
      const list = toolsByJob.get(key) ?? [];
      list.push({ status: t.status, tool: t.tool });
      toolsByJob.set(key, list);
    }

    const agents = buildRoomAgents(roomAgentRows, agentsById, jobs, toolsByJob);

    const humans = buildHumans(
      roomHumanRows,
      users,
      presenceRows,
      roomId,
      myHex,
      presence,
      typingIdentities
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

    const messages = buildChatMessages(
      messageRows,
      agentsById,
      users,
      latestJobByThread,
      toolsByJob,
      chunksByMessage,
      ticks
    );

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
      threads.find((t) => t.title === "General" || t.title === room?.name) ??
      threads.find((t) => !latestJobByThread.has(String(t.threadId))) ??
      undefined;

    return {
      agents,
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
    renameVer,
    typingIdentities,
  ]);
};

export interface ThreadDetails {
  thread: Thread | undefined;
  originMessage: ChatMessage | undefined;
  steeringNotices: ChatMessage[];
  agentWork: AgentWork[];
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
        originMessage: undefined,
        ready: false,
        steeringNotices: [],
        thread: undefined,
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

    const toolsByJob = new Map<string, { status: number; tool: string }[]>();
    for (const t of toolRows) {
      const key = String(t.jobId);
      const list = toolsByJob.get(key) ?? [];
      list.push({ status: t.status, tool: t.tool });
      toolsByJob.set(key, list);
    }

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
          jobStatus: undefined,
          mentions: [...m.mentions],
          messageId: m.messageId,
          role: m.role,
          roomId: m.roomId,
          streaming: m.streaming,
          threadId: m.threadId,
          ticks: ticks.get(String(m.messageId)),
          toolCall: undefined,
        };
      });

    const originMessage = allMessages.find((m) => m.role === 0);
    const steeringNotices = allMessages.filter(
      (m) => m.role === 0 && m.messageId !== originMessage?.messageId
    );

    const jobs = jobRows.filter((j) => j.threadId === threadId);

    // Build one work tab per agent that actually ran in this thread. Idle
    // agents (never tagged, no job, no reply) are omitted entirely.
    const agentWork: AgentWork[] = agents
      .map((agent) => {
        const agentMsgs = allMessages.filter(
          (m) => m.authorAgent === agent.agentId
        );
        const agentJobs = jobs.filter(
          (j) => j.taggedAgent === agent.agentId || j.taggedAgent === undefined
        );

        let status: "working" | "done" | "failed" | "idle" = "idle";
        if (
          agentMsgs.some((m) => m.streaming) ||
          agentJobs.some(
            (j) =>
              j.status === JobStatus.Running || j.status === JobStatus.Queued
          )
        ) {
          status = "working";
        } else if (agentJobs.some((j) => j.status === JobStatus.Failed)) {
          status = "failed";
        } else if (
          agentMsgs.length > 0 ||
          agentJobs.some((j) => j.status === JobStatus.Done)
        ) {
          status = "done";
        }

        const lastMsg = agentMsgs.at(-1);
        let preview = "";
        if (lastMsg) {
          preview = (
            lastMsg.body || lastMsg.chunks.map((c) => c.delta).join("")
          ).slice(0, 140);
        } else if (status === "working") {
          preview = "Working on response…";
        }

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
        };
      })
      .filter((work) => work.status !== "idle");

    return {
      agentWork,
      allMessages,
      originMessage,
      ready: threadsReady && msgsReady,
      steeringNotices,
      thread,
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
  send: (body: string, mentions: bigint[]) => void;
} => {
  const startThread = useReducer(reducers.startThread);
  const postMessage = useReducer(reducers.postMessage);

  const [freshArmed, setFreshArmed] = useState(false);
  const [busyNotice, setBusyNotice] = useState<BusyNotice | null>(null);

  const clearBusyNotice = useCallback(() => {
    setBusyNotice(null);
  }, []);

  const send = useCallback(
    (body: string, mentions: bigint[]) => {
      setBusyNotice(null);
      const trimmed = body.trim();
      if (!trimmed) {
        return;
      }

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
              prompt: trimmed,
              roomId,
              taggedAgent: taggedId,
              title: trimmed.slice(0, 60),
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
              prompt: trimmed,
              roomId,
              taggedAgent: undefined,
              title: trimmed.slice(0, 60),
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
              body: trimmed,
              mentions: [],
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
            prompt: trimmed,
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
): ((body: string, mentions: bigint[]) => void) => {
  const postMessage = useReducer(reducers.postMessage);
  return useCallback(
    (body: string, mentions: bigint[]) => {
      if (threadId === null) {
        return;
      }
      const run = async (): Promise<void> => {
        try {
          await postMessage({
            body,
            mentions,
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
