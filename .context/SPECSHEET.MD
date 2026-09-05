Neb — Revised API Sheet (SpacetimeDB-viable)
No reducer returns. No external I/O in reducers. ctx.sender: Identity is auth. Worker does LLM/memory/tools externally and writes back via reducers.
1. Tables (TS shapes, snake_case names)
user (public)
identity: t.identity().primaryKey()
display_name: t.string()
created_at: t.timestamp()
No u64 user ids. Everything else stores Identity. No company_id for MVP (single company per your prior answer); add later as indexed column.
workspace (public)
workspace_id: t.u64().primaryKey().autoInc()
name: t.string()
created_by: t.identity()
created_at: t.timestamp()
room (public)
room_id: t.u64().primaryKey().autoInc()
workspace_id: t.u64().index('btree')
name: t.string()
topic: t.string()
canvas_x: t.i32()        // was f32; i32 avoids float-ordering pain
canvas_y: t.i32()
memory_backend: t.string() // "honcho" | "hindsight", not Enum
memory_namespace: t.string()
status: t.u8()           // 0=active, 1=archived
created_by: t.identity()
created_at: t.timestamp()
room_human + room_agent (public, replaces polymorphic room_member)
// room_human
room_id: t.u64()
identity: t.identity()
joined_at: t.timestamp()
// indexes: [{accessor:'by_room', columns:['room_id','identity']}]
// room_agent
room_id: t.u64()
agent_id: t.u64()
added_at: t.timestamp()
// indexes: [{accessor:'by_room', columns:['room_id','agent_id']}]
Old member_type + member_id: u64 can't enforce FKs and mixes Identity/u64. Split is queryable.
agent (public)
agent_id: t.u64().primaryKey().autoInc()
workspace_id: t.u64().index('btree')
name: t.string()
system_prompt: t.string()
tools: t.array(t.string())       // was Vec<u64> tool_ids; store tool names, no tool table needed for MVP
model_provider: t.string()
model_name: t.string()
created_by: t.identity()
created_at: t.timestamp()
No tool table for MVP. Tool registry lives in worker code. Add it back only when you need user-defined tools.
room_presence (public)
identity: t.identity().primaryKey()
room_id: t.u64().index('btree')
last_seen: t.timestamp()
Updated by heartbeat + clientConnected/clientDisconnected. ctx.connectionId is nullable, guard it, don't store it as PK.
thread (public)
thread_id: t.u64().primaryKey().autoInc()
room_id: t.u64().index('btree')
title: t.string()
created_by: t.identity()   // was started_by: u64 — use ctx.sender
status: t.u8()             // 0=open, 1=streaming, 2=merged, 3=closed
merge_session_id: t.option(t.u64())
created_at: t.timestamp()
message (public)
message_id: t.u64().primaryKey().autoInc()
thread_id: t.u64().index('btree')
room_id: t.u64().index('btree')
author: t.identity()       // was sender_type+sender_id: u64 — use ctx.sender
author_agent: t.option(t.u64()) // null = human
body: t.string()           // final text only; streaming goes to chunks
role: t.u8()               // 0=user, 1=agent, 2=synthesis, 3=system
streaming: t.bool()
mentions: t.array(t.u64()) // tagged agent ids
created_at: t.timestamp()
message_chunk (public, the streaming transport)
chunk_id: t.u64().primaryKey().autoInc()
message_id: t.u64().index('btree')
idx: t.u32()
delta: t.string()
created_at: t.timestamp()
Replaces stream_update(message_id, partial_content) rewriting message.content per token. UI concatenates ORDER BY idx. Persistent.
stream_event (public, event: true)
message_id: t.u64()
kind: t.string()   // "thinking"|"typing"|"tool_start"|"tool_end"
payload: t.string()
created_at: t.timestamp()
Ephemeral live ticks. onInsert fires, never cached. This is "watch it think".
ai_job (public, worker queue — replaces internal route_message)
job_id: t.u64().primaryKey().autoInc()
thread_id: t.u64().index('btree')
room_id: t.u64().index('btree')
prompt: t.string()
tagged_agent: t.option(t.u64())
angle: t.string()
status: t.u8()  // 0=queued, 1=running, 2=done, 3=failed
created_by: t.identity()
created_at: t.timestamp()
tool_call (public)
call_id: t.u64().primaryKey().autoInc()
job_id: t.u64().index('btree')
tool: t.string()          // was tool_id FK; string name is enough
input: t.string()         // JSON-encoded; structured object if schema fixed
output: t.option(t.string())
status: t.u8()            // 0=pending, 1=running, 2=done, 3=failed
created_at: t.timestamp()
merge_session (public, replaces convergence_group)
session_id: t.u64().primaryKey().autoInc()
room_id: t.u64().index('btree')
status: t.u8()  // 0=detected, 1=streaming, 2=merged
final_message_id: t.option(t.u64())
created_at: t.timestamp()
merge_link (public, replaces thread_ids: Vec<u64>)
session_id: t.u64()
thread_id: t.u64()
// indexes: [{accessor:'by_session', columns:['session_id','thread_id']}]
exploration (public)
exploration_id: t.u64().primaryKey().autoInc()
session_id: t.u64().index('btree')
job_id: t.u64()
angle: t.string()
status: t.u8()
message_id: t.u64()
room_memory_entry (public, local cache of Honcho/Hindsight)
memory_id: t.u64().primaryKey().autoInc()
room_id: t.u64().index('btree')
thread_id: t.u64()
summary: t.string()
embedding_ref: t.option(t.string())
weight: t.f32()
created_at: t.timestamp()
workspace_snapshot (public, replaces workspace_progress_snapshot)
snapshot_id: t.u64().primaryKey().autoInc()
workspace_id: t.u64().index('btree')
payload: t.string()       // JSON map room_id -> summary; opaque string in DB
generated_at: t.timestamp()
Written by scheduled reducer, not on-demand query.
snapshot_timer (private, scheduled)
table({name:'snapshot_timer', scheduled: (): any => rollup_snapshots}, {
  scheduled_id: t.u64().primaryKey().autoInc(),
  scheduled_at: t.scheduleAt(),
  workspace_id: t.u64(),
})
worker_allowlist (private)
identity: t.identity().primaryKey()
label: t.string()
Seeded in init. Worker-only reducers (claim_job, complete_job, publish_synthesis, etc.) check ctx.db.worker_allowlist.identity.find(ctx.sender).
2. Reducers (all void, all auth via ctx.sender)
Workspace/rooms:
- create_workspace({name}) — created_by=ctx.sender
- create_room({workspace_id, name, topic, canvas_x, canvas_y, memory_backend, memory_namespace})
- move_room({room_id, canvas_x, canvas_y})
- archive_room({room_id})
- join_room({room_id}) / leave_room({room_id}) — replaces add_room_member(room_id, member_type, member_id); identity comes from ctx.sender
- heartbeat({room_id}) — upserts room_presence{identity: ctx.sender} with ctx.timestamp
- register_agent({workspace_id, name, system_prompt, tools, model_provider, model_name}) — tools: string[]
- add_agent_to_room({room_id, agent_id}) / remove_agent_from_room({room_id, agent_id})
Threads/messages (UI calls these):
- start_thread({room_id, title, prompt, tagged_agent?: bigint, angle}) — inserts thread + user message + ai_job{status:queued}, bumps room_summary equivalent. No similarity search here.
- post_message({thread_id, body, mentions}) — looks up thread.room_id server-side, inserts message + follow-up ai_job.
- close_thread({thread_id}) — owner or room member check via ctx.sender.
Worker-only (guarded by allowlist):
- claim_job({job_id}), append_chunk({message_id, idx, delta}) (+ stream_event insert), complete_job({job_id, final_body, routing}), fail_job({job_id, error})
- log_tool_call({job_id, tool, input}), resolve_tool_call({call_id, output, status})
- open_merge_session({room_id}), link_thread_to_merge({session_id, thread_id}), publish_synthesis({session_id, body}) — inserts synthesis message{role:2}, sets threads to merged, sets session.status=merged
- push_room_memory({room_id, thread_id, summary, embedding_ref?, weight}), promote_to_snapshot via rollup_snapshots (scheduled)
Deleted from old sheet: route_message, detect_overlap, start_convergence, stream_update, merge_convergence(...) -> id, query_room_memory(...) -> Vec. All that intelligence moves to worker (below). generate_workspace_snapshot(workspace_id) -> id becomes scheduled rollup_snapshots writing workspace_snapshot rows.
Lifecycle:
- init — seed worker allowlist entry + default workspace/agent
- clientConnected / clientDisconnected — export const, null-check ctx.connectionId, touch room_presence
3. Worker contract (not reducers)
Worker subscribes to ai_job[status=queued], loads room_memory_entry + recent message + agent.system_prompt, decides memory|tool|direct, runs Honcho/Hindsight + LLM + tools, streams via append_chunk, detects overlap (same room_id, 90s window, similarity threshold — tunable in worker, not DB), drives merge via the merge reducers above.
4. Subscriptions + views for UI teammate
- Canvas: room.where(r => r.workspaceId.eq(ws)) + workspace_snapshot latest row + room_presence counts
- Room thread list: thread.where(t => t.roomId.eq(room))
- Live thread: message.where(m => m.threadId.eq(t)) + message_chunk.where(c => c.messageId.eq(m)) + stream_event.onInsert for thinking ticks
- Merge UI: merge_session.where(s => s.roomId.eq(room)) + merge_link + exploration
- Memory debug: room_memory_entry.where(e => e.roomId.eq(room))
Add anonymous view active_rooms over non-archived rooms + per-user view only if you need private filtering later.
5. Open knobs (worker-side, not schema)
- Overlap window (90s default) + similarity threshold
- routing classifier: heuristic first, LLM fallback
- Chunk size (200-500 chars) to bound update fan-out
- Snapshot interval (ScheduleAt.interval(300_000_000n) = 5min)
This preserves every domain from the old sheet, but every reducer is now deterministic, every return is a subscription, and every external call lives in the worker where it can actually run.