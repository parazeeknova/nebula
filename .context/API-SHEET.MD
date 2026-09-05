# Neb — API Sheet (SpacetimeDB Tables + Reducers)

SpacetimeDB has no REST layer by default — clients subscribe to tables and call reducers. This sheet lists both, organized by domain. Treat table schemas as a starting point, adjust types once you pick your memory backend's SDK shapes.

---

## 1. Tables

### `company`
| Field | Type | Notes |
|---|---|---|
| id | u64 (PK) | |
| name | String | |
| created_at | Timestamp | |
| owner_id | u64 | FK -> `user.id` |

### `workspace`
| Field | Type | Notes |
|---|---|---|
| id | u64 (PK) | |
| company_id | u64 | FK -> `company.id` |
| name | String | |
| canvas_state | JSON/Blob | pan/zoom, saved view, room layout metadata |
| created_at | Timestamp | |

### `room`
| Field | Type | Notes |
|---|---|---|
| id | u64 (PK) | |
| workspace_id | u64 | FK -> `workspace.id` |
| name | String | |
| canvas_x | f32 | position on infinite canvas |
| canvas_y | f32 | |
| memory_backend | Enum(Honcho, Hindsight) | per-room choice, if you support both |
| memory_namespace_id | String | external memory-service session/collection id |
| created_at | Timestamp | |

### `room_member`
| Field | Type | Notes |
|---|---|---|
| room_id | u64 | FK -> `room.id` |
| member_type | Enum(Human, Agent) | |
| member_id | u64 | FK -> `user.id` or `agent.id` depending on member_type |
| joined_at | Timestamp | |

### `agent`
| Field | Type | Notes |
|---|---|---|
| id | u64 (PK) | |
| workspace_id | u64 | agents are defined at workspace level, attached to rooms via `room_member` |
| name | String | e.g. "research-bot", "neb" |
| system_prompt | String | |
| tool_ids | Vec\<u64\> | FK -> `tool.id` |
| model_provider | String | |
| model_name | String | |

### `tool`
| Field | Type | Notes |
|---|---|---|
| id | u64 (PK) | |
| name | String | |
| schema | JSON | tool-call schema, params |
| handler_ref | String | maps to a reducer or external function |

### `thread`
| Field | Type | Notes |
|---|---|---|
| id | u64 (PK) | |
| room_id | u64 | FK -> `room.id` |
| title | String | optional, can be auto-generated |
| started_by | u64 | FK -> `user.id` |
| status | Enum(Active, Merged, Closed) | |
| merged_into_thread_id | Option\<u64\> | set when this thread was folded into another via convergence |
| created_at | Timestamp | |

### `message`
| Field | Type | Notes |
|---|---|---|
| id | u64 (PK) | |
| thread_id | u64 | FK -> `thread.id` |
| sender_type | Enum(Human, Agent) | |
| sender_id | u64 | |
| content | String | |
| mentions | Vec\<u64\> | tagged agent/user ids |
| tool_call_id | Option\<u64\> | FK -> `tool_call.id`, if this message triggered one |
| streaming | bool | true while agent response is still in-progress |
| created_at | Timestamp | |

### `tool_call`
| Field | Type | Notes |
|---|---|---|
| id | u64 (PK) | |
| message_id | u64 | FK -> `message.id` that triggered it |
| agent_id | u64 | FK -> `agent.id` |
| tool_id | u64 | FK -> `tool.id` |
| input | JSON | |
| output | Option\<JSON\> | null while running |
| status | Enum(Pending, Running, Done, Failed) | |

### `convergence_group`
Tracks two-or-more overlapping threads being merged.

| Field | Type | Notes |
|---|---|---|
| id | u64 (PK) | |
| room_id | u64 | FK -> `room.id` |
| thread_ids | Vec\<u64\> | the overlapping threads being converged |
| status | Enum(Detected, Streaming, Merging, Complete) | |
| synthesized_message_id | Option\<u64\> | final merged answer, once posted |
| created_at | Timestamp | |

### `room_memory_entry`
Optional local cache/index of what's been pushed to Honcho/Hindsight, useful for debugging and for the workspace rollup without re-querying the external service every time.

| Field | Type | Notes |
|---|---|---|
| id | u64 (PK) | |
| room_id | u64 | FK -> `room.id` |
| thread_id | u64 | FK -> `thread.id` |
| summary | String | short summary pushed to/pulled from memory backend |
| embedding_ref | Option\<String\> | pointer into external vector store, if applicable |
| created_at | Timestamp | |

### `workspace_progress_snapshot`
The rollup layer backing the canvas-level overview.

| Field | Type | Notes |
|---|---|---|
| id | u64 (PK) | |
| workspace_id | u64 | FK -> `workspace.id` |
| room_summaries | JSON | map of room_id -> latest summary/status |
| generated_at | Timestamp | |

### `user`
| Field | Type | Notes |
|---|---|---|
| id | u64 (PK) | |
| identity | Identity | SpacetimeDB identity |
| display_name | String | |
| company_id | u64 | |

---

## 2. Reducers

### Workspace / Room lifecycle
- `create_workspace(company_id, name) -> workspace_id`
- `create_room(workspace_id, name, canvas_x, canvas_y, memory_backend) -> room_id`
- `move_room(room_id, canvas_x, canvas_y)`
- `add_room_member(room_id, member_type, member_id)`
- `remove_room_member(room_id, member_id)`

### Agents / Tools
- `register_agent(workspace_id, name, system_prompt, tool_ids, model_provider, model_name) -> agent_id`
- `update_agent(agent_id, ...)`
- `register_tool(name, schema, handler_ref) -> tool_id`

### Threads / Messages
- `start_thread(room_id, started_by, first_message) -> thread_id`
- `send_message(thread_id, sender_type, sender_id, content, mentions) -> message_id`
  - Internally triggers the **routing decision** (see below) before returning.
- `close_thread(thread_id)`

### Routing (internal, called from `send_message`)
- `route_message(message_id) -> RoutingDecision { UseAgent(agent_id, tool_id), UseRoomMemory }`
  - Reads `room_memory_entry` / queries external memory backend for context sufficiency.
  - If `UseAgent`, calls `invoke_tool_call`.

### Tool execution
- `invoke_tool_call(message_id, agent_id, tool_id, input) -> tool_call_id`
- `resolve_tool_call(tool_call_id, output, status)` — called when the external tool/agent finishes; updates `tool_call` and posts the agent's reply via `send_message` (sender_type = Agent).

### Convergence engine
- `detect_overlap(room_id, thread_id) -> Option<convergence_group_id>`
  - Runs on every new thread start; compares against other `Active` threads in the same room via memory-backend similarity search.
- `start_convergence(convergence_group_id)` — sets status to `Streaming`, both underlying agent runs proceed with `message.streaming = true`.
- `stream_update(message_id, partial_content)` — appends partial tokens to a streaming message row; clients subscribed to the thread see it live.
- `merge_convergence(convergence_group_id) -> synthesized_message_id`
  - Called once both threads' agent runs finish (`Done`); invokes neb with both outputs, posts the synthesized message to the room, sets `convergence_group.status = Complete`, marks source threads `Merged`.

### Memory
- `push_room_memory(room_id, thread_id, summary)` — writes to `room_memory_entry` and forwards to Honcho/Hindsight.
- `query_room_memory(room_id, query) -> Vec<room_memory_entry>` — used by `route_message` and by agents needing room context.
- `generate_workspace_snapshot(workspace_id) -> snapshot_id` — rolls up latest `room_memory_entry` per room into `workspace_progress_snapshot`. Can be called on a timer or on-demand when the canvas view opens.

### Presence (SpacetimeDB-native)
- `client_connected` / `client_disconnected` — lifecycle reducers SpacetimeDB calls automatically; use to update online/typing presence per room.

---

## 3. Client Subscriptions (what the frontend subscribes to)

- `SELECT * FROM room WHERE workspace_id = ?` — canvas view
- `SELECT * FROM thread WHERE room_id = ?` — room's thread list
- `SELECT * FROM message WHERE thread_id = ?` — live thread view, including `streaming` rows for in-progress agent output
- `SELECT * FROM convergence_group WHERE room_id = ? AND status != Complete` — drives the "watch both angles streaming" UI
- `SELECT * FROM workspace_progress_snapshot WHERE workspace_id = ? ORDER BY generated_at DESC LIMIT 1` — canvas-level overview panel

---

## 4. Open Implementation Questions

- [ ] `detect_overlap` similarity threshold and whether it runs synchronously on `start_thread` or as an async job.
- [ ] Whether `route_message` needs a full LLM call to decide agent-vs-memory, or a cheaper classifier/heuristic first pass.
- [ ] Streaming transport — SpacetimeDB row updates on `message.content`/`stream_update` vs. a side-channel (SSE/WebSocket) from the agent runtime into SpacetimeDB.
- [ ] Auth/identity mapping between SpacetimeDB `Identity` and your `user` table (SSO provider TBD).